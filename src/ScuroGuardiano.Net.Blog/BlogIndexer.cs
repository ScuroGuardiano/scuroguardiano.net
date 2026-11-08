using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ScuroGuardiano.Net.Blog.Model;
using ScuroGuardiano.Slugify;

namespace ScuroGuardiano.Net.Blog;

/// <summary>
/// Zasrany clusterfuck, który powinien być thread safe, bo jest przeznaczony do rejestracji jako singleton.
/// </summary>
internal partial class BlogIndexer : IDisposable
{
    public IReadOnlyDictionary<string, BlogPost> Posts => _posts;

    /// <summary>
    /// Slug -> BlogPost
    /// </summary>
    private ConcurrentDictionary<string, BlogPost> _posts = new();
    private Dictionary<string, string> _fileToSlugMapping = new();

    private BlogOptions _options;
    private readonly IDisposable? _optionsSubscription;
    private readonly ILogger<BlogIndexer> _logger;
    private CancellationTokenSource? _indexingCancellationTokenSource = new();
    private readonly MarkdownParser _markdownParser;
    private readonly Slugifier  _slugifier;
    private readonly Lock _indexingCancellationLock = new();
    private readonly SemaphoreSlim _indexingSemaphore = new(1, 1);

    public BlogIndexer(IOptionsMonitor<BlogOptions> options, ILogger<BlogIndexer> logger, MarkdownParser markdownParser, Slugifier slugifier)
    {
        _logger = logger;
        _markdownParser = markdownParser;
        _slugifier = slugifier;
        _options = options.CurrentValue;
        _optionsSubscription = options.OnChange(async void (newOptions) =>
        {
            try
            {
                Interlocked.Exchange(ref _options, newOptions);
                await IndexAsync();
            }
            catch (Exception e)
            {
                LogIndexingError(e.ToString(), e);
            }
        });
    }

    public void Remove(string file)
    {
        try
        {
            _indexingSemaphore.Wait();

            var slug = _fileToSlugMapping.GetValueOrDefault(file);
            if (slug is null)
            {
                return;
            }

            if (_posts.Remove(slug, out _))
            {
                LogPostHasBeenRemoved(file, slug);
            }
        }
        finally
        {
            _indexingSemaphore.Release();
        }
    }

    public async Task UpdateOrAddAsync(string file)
    {
        // Cancellation token jest wywoływany w momencie kiedy zaczyna się nowa operacja indeksowania.
        // W takim wypadku należy przerwać aktualizację jednego pliku, bo indeksowanie i tak resetuje słownik.
        CancellationToken cancellationToken = GetSafelyCancellationToken();

        try
        {
            await _indexingSemaphore.WaitAsync(cancellationToken);
            var post = await GetPostHeader(file, cancellationToken);

            if (post is null)
            {
                throw new InvalidOperationException($"Coś jest nie tak z postem {file}.");
            }

            if (_fileToSlugMapping.TryGetValue(file, out var slug))
            {
                // Muszę sprawdzić czy slug się nie zmienił, jeżeli nie to aktualizuję posta i bajlando
                if (post.Slug == slug)
                {
                    _posts[slug] = post;
                    LogPostHasBeenUpdated(file, post.Slug);
                    return;
                }

                // Slug się zmienił, muszę usunąć istniejącego posta i dodać go na nowym slugu, a także zmienić mapowanie.
                // Mapowanie zostanie dodane podczas dodawania posta, więc tu je po prostu usunę
                _posts.Remove(slug, out _);
                _fileToSlugMapping.Remove(file);
                LogPostRemoveOnSlugChangeDuringUpdate(file, slug, post.Slug);
            }

            // Post nie istnieje lub jego slug się zmienił, więc muszę go dodać, ale wpierw sprawdźmy czy nie istnieje już post o tym slugu.
            if (_posts.TryGetValue(post.Slug, out var existingPost))
            {
                LogPostSlugCollision(post.Slug, file);
                throw new InvalidOperationException(
                    $"Kolizacja slugu {post.Slug} posta {file} z postem {existingPost.Slug}");
            }

            _posts[post.Slug] = post;
            _fileToSlugMapping[file] = post.Slug;

            LogPostHasBeedAdded(file, post.Slug);
        }
        catch (Exception exception)
        {
            if (exception is not OperationCanceledException)
            {
                LogPostUpdateException(file, exception.ToString(), exception);
            }
            throw;
        }
        finally
        {
            _indexingSemaphore.Release();
        }
    }

    public async Task RenameAsync(string oldFile, string newFile)
    {
        // Zajebiście prosta sprawa, usuwamy stary, dodajemy nowy, ez
        Remove(oldFile);
        await UpdateOrAddAsync(newFile);
    }

    public async Task IndexAsync()
    {
        CancellationToken cancellationToken;

        lock (_indexingCancellationLock)
        {
            var oldTokenSource = _indexingCancellationTokenSource;
            _indexingCancellationTokenSource = new CancellationTokenSource();

            if (oldTokenSource is not null && !oldTokenSource.IsCancellationRequested)
            {
                // Anuluj poprzenią operację indeksowania.
                try
                {
                    oldTokenSource.Cancel();
                    oldTokenSource.Dispose();
                }
                catch (ObjectDisposedException)
                {}
            }

            cancellationToken = _indexingCancellationTokenSource.Token;
        }

        try
        {
            await _indexingSemaphore.WaitAsync(cancellationToken);
            await IndexCore(cancellationToken);
        }
        finally
        {
            _indexingSemaphore.Release();
            Interlocked.Exchange(ref _indexingCancellationTokenSource, null);
        }
    }

    private async Task IndexCore(CancellationToken cancellationToken)
    {
        var posts = new ConcurrentDictionary<string, BlogPost>();
        var fileToSlugMapping = new Dictionary<string, string>();

        foreach (var file in Directory.EnumerateFiles(_options.PostsDirectory, "*.md"))
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var post = await GetPostHeader(file, cancellationToken);

                if (post is null)
                {
                    continue;
                }

                if (posts.ContainsKey(post.Slug))
                {
                    LogPostSlugCollision(post.Slug, file);
                }

                posts[post.Slug] = post;
                fileToSlugMapping[file] = post.Slug;
            }
            catch (Exception exception)
            {
                LogPostFileIndexException(file, exception.ToString(), exception);
            }
        }

        _posts = posts;
        _fileToSlugMapping = fileToSlugMapping;
        LogPostsHaveBeenIndexed(_options.PostsDirectory);
    }

    private async Task<BlogPost?> GetPostHeader(string file, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var content = await File.ReadAllTextAsync(file, cancellationToken);
        var frontMatter = _markdownParser.DeserializeFrontMatter<BlogPostFrontMatter>(content);
        if (frontMatter is null)
        {
            LogPostInvalidFrontMatter(file);
            return null;
        }

        var slug = _slugifier.Slugify(frontMatter.Title);
        if (string.IsNullOrWhiteSpace(slug))
        {
            LogPostInvalidTitle(file);
            return null;
        }

        var post = new BlogPost
        {
            Title = frontMatter.Title,
            Slug = slug,
            Tags = frontMatter.Tags,
            FileName = file,
            CreatedAt = frontMatter.CreatedAt,
            PublishedAt = frontMatter.PublishedAt
        };

        return post;
    }

    /// <summary>
    /// Lockuje, żeby zwrócić jebany cancellation token.
    /// </summary>
    /// <returns></returns>
    private CancellationToken GetSafelyCancellationToken()
    {
        CancellationToken token;

        lock (_indexingCancellationLock)
        {
            token = _indexingCancellationTokenSource?.Token ?? CancellationToken.None;
        }

        return token;
    }

    public void Dispose()
    {
        _optionsSubscription?.Dispose();
        GC.SuppressFinalize(this);
    }

    ~BlogIndexer()
    {
        _optionsSubscription?.Dispose();
    }
}
