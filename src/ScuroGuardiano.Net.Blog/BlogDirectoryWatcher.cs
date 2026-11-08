using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ScuroGuardiano.Net.Blog;

internal class BlogDirectoryWatcher : BackgroundService
{
    private readonly BlogIndexer _blogIndexer;
    private BlogOptions _blogOptions;
    private readonly IDisposable? _optionsSubscription;
    private FileSystemWatcher? _watcher;
    private readonly ILogger<BlogDirectoryWatcher> _logger;

    public BlogDirectoryWatcher(BlogIndexer blogIndexer, IOptionsMonitor<BlogOptions> blogOptions, ILogger<BlogDirectoryWatcher> logger)
    {
        _blogIndexer = blogIndexer;
        _logger = logger;
        _blogOptions = blogOptions.CurrentValue;
        _optionsSubscription = blogOptions.OnChange(options =>
        {
            Interlocked.Exchange(ref _blogOptions, options);
        });
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await StartWatcher(stoppingToken);
    }

    private async Task StartWatcher(CancellationToken cancellationToken)
    {
        var postsDirectory = _blogOptions.PostsDirectory;
        _watcher = CreateWatcher(postsDirectory);

        _logger.LogInformation("Startuję FileSystemWatcher na folderze: {PostsDirectory}",  postsDirectory);

        while (!cancellationToken.IsCancellationRequested)
        {
            // Watcher słucha synchronicznie i powoduje opóźnienie w wyłączeniu aplikacji aż do jej timeoutu.
            // Więc muszę dodać tutaj timeout, żeby watcher mógł sprawdzić czy akcja stopu nie została wywołana.
            var result = _watcher.WaitForChanged(WatcherChangeTypes.All, TimeSpan.FromSeconds(1));
            if (result.TimedOut)
            {
                continue;
            }

            if (postsDirectory != _blogOptions.PostsDirectory)
            {
                // folder postów się zmienił, zignoruj zmiany i zmień katalog watchera
                // Nie wiem czy poprzednie eventy watchera znikają po zmianie ścieżki, więc zastępujemy całego watchera.
                postsDirectory = _blogOptions.PostsDirectory;
                _logger.LogInformation("Folder postów się zmienił, zmieniam FileSystemWatcher na {PostsDirectory}", postsDirectory);
                _watcher.Dispose();
                _watcher = new FileSystemWatcher(postsDirectory);
                continue;
            }

            try
            {
                await HandleChange(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Wystąpił błąd podczas obsługi zmiany w folderze postów: {ExceptionStringified}", ex.ToString());
            }
        }
    }

    private async Task HandleChange(WaitForChangedResult result)
    {
        if (result.Name is null)
        {
            return;
        }

        switch (result.ChangeType)
        {
            case WatcherChangeTypes.Created:
            case WatcherChangeTypes.Changed:
                await _blogIndexer.UpdateOrAddAsync(result.Name);
                break;

            case WatcherChangeTypes.Deleted:
                _blogIndexer.Remove(result.Name);
                break;

            case WatcherChangeTypes.Renamed when result.OldName is not null:
                await _blogIndexer.RenameAsync(result.OldName, result.Name);
                break;

            case WatcherChangeTypes.All:
            default:
                throw new ArgumentOutOfRangeException();
        }
    }

    private static FileSystemWatcher CreateWatcher(string directory)
    {
        FileSystemWatcher watcher = new FileSystemWatcher(directory)
        {
            NotifyFilter = NotifyFilters.LastWrite,
            Filter = "*.md"
        };

        return watcher;
    }

    public override void Dispose()
    {
        base.Dispose();
        _optionsSubscription?.Dispose();
        _watcher?.Dispose();
    }
}
