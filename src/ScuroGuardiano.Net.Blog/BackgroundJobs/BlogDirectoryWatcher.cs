using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading.Channels;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ScuroGuardiano.Net.Blog.Services;

namespace ScuroGuardiano.Net.Blog.BackgroundJobs;

/// <summary>
/// <para>
/// Ten potwór próbuje być jak najbardziej reaktywny jak to możliwe,
/// jednocześnie implementując logikę debounce'a dla eventów zmiany w FS, bo przynajmniej Linux,
/// lubi napierdzielać kilkoma eventami z rzędu przy pojedynczej zmianie.
/// </para>
/// <para>
/// Watcher ten reaguje na:
/// <ul>
///     <li>Dodanie, usunięcie, zmianę nazwy oraz modyfikację plików</li>
///     <li>Zmianę folderu z postami w konfiguracji</li>
///     <li>Hopefully, jest thread safe i nie ma żadnych race condition ani memory leaków</li>
/// </ul>
/// </para>
/// </summary>
internal class BlogDirectoryWatcher : BackgroundService
{
    private readonly BlogIndexer _blogIndexer;
    private BlogOptions _blogOptions;
    private readonly IDisposable? _optionsSubscription;
    private FileSystemWatcher? _watcher;
    private readonly ILogger<BlogDirectoryWatcher> _logger;
    private readonly Lock _watcherSwapLock = new();

    private readonly Channel<FileSystemChange> _changesChannel = Channel
        .CreateBounded<FileSystemChange>(new BoundedChannelOptions(1337)
        {
            FullMode = BoundedChannelFullMode.DropWrite,
            SingleReader = true
        });

    private readonly PendingChangesDictionary _pendingChanges = new PendingChangesDictionary();

    public BlogDirectoryWatcher(BlogIndexer blogIndexer, IOptionsMonitor<BlogOptions> blogOptions, ILogger<BlogDirectoryWatcher> logger)
    {
        _blogIndexer = blogIndexer;
        _logger = logger;
        _blogOptions = blogOptions.CurrentValue;
        _optionsSubscription = blogOptions.OnChange(options =>
        {
            var oldDirectory = Volatile.Read(ref _blogOptions).PostsDirectory;
            Volatile.Write(ref _blogOptions, options);

            if (oldDirectory != options.PostsDirectory)
            {
                lock (_watcherSwapLock)
                {
                    CreateOrReplaceWatcher(options.PostsDirectory);
                    _pendingChanges.DisposeAll();
                    _pendingChanges.Clear();
                }
            }
        });
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await StartWatcher(stoppingToken);
    }

    private async Task StartWatcher(CancellationToken cancellationToken)
    {
        var postsDirectory = _blogOptions.PostsDirectory;
        CreateOrReplaceWatcher(postsDirectory);

        _logger.LogInformation("Startuję FileSystemWatcher na folderze: {PostsDirectory}", postsDirectory);

        while (!cancellationToken.IsCancellationRequested)
        {
            var changes = _changesChannel.Reader.ReadAllAsync(cancellationToken);

            await foreach (var change in changes)
            {
                var fsChange = new FileSystemChangeKey(change.Name!, change.ChangeType == WatcherChangeTypes.Renamed);

                if (_pendingChanges.TryRemove(
                        fsChange,
                        out var oldChangeHandler))
                {
                    oldChangeHandler.Dispose();
                }

                var changeHandler = new ChangeHandler(_blogIndexer, _logger);
                _pendingChanges[fsChange] = changeHandler;
                changeHandler.ExecuteTask = changeHandler.HandleChange(change)
                    .ContinueWith(_ =>
                    {
                        var kv = new KeyValuePair<FileSystemChangeKey, ChangeHandler>(fsChange, changeHandler);
                        _pendingChanges.TryRemove(kv);
                    }, TaskScheduler.Default);
            }
        }
    }

    private void CreateOrReplaceWatcher(string directory)
    {
        _watcher?.Dispose();
        FileSystemWatcher watcher = new FileSystemWatcher(directory)
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName,
            Filter = "*.md"
        };

        watcher.Created += HandleFileSystemEvent;
        watcher.Changed += HandleFileSystemEvent;
        watcher.Deleted += HandleFileSystemEvent;
        watcher.Renamed += HandleRenameEvent;

        watcher.EnableRaisingEvents = true;
        _watcher = watcher;
    }

    private void HandleFileSystemEvent(object sender, FileSystemEventArgs e)
    {
        if (e.Name is null)
        {
            return;
        }

        _changesChannel.Writer.TryWrite(new FileSystemChange(e.Name, null, e.ChangeType));
        // TODO: obsłużenie sytuacji kiedy kanał będzie pełny
    }

    private void HandleRenameEvent(object sender, RenamedEventArgs e)
    {
        if (e.Name is null)
        {
            return;
        }

        _changesChannel.Writer.TryWrite(new FileSystemChange(e.Name, e.OldName, e.ChangeType));
        // TODO: obsłużenie sytuacji, w której kanał będzie pełny
    }

    public override void Dispose()
    {
        base.Dispose();
        _optionsSubscription?.Dispose();
        _pendingChanges.DisposeAll();
        ExecuteTask?.Wait(TimeSpan.FromSeconds(5));
        _watcher?.Dispose();
    }


    private class ChangeHandler : IDisposable
    {
        private readonly BlogIndexer _blogIndexer;
        private readonly CancellationTokenSource _cancellationTokenSource = new();
        private readonly ILogger<BlogDirectoryWatcher> _logger;
        public Task? ExecuteTask { get; set; }

        // ReSharper disable once ContextualLoggerProblem
        public ChangeHandler(BlogIndexer blogIndexer, ILogger<BlogDirectoryWatcher> logger)
        {
            _blogIndexer = blogIndexer;
            _logger = logger;
        }

        public void Cancel()
        {
            _cancellationTokenSource.Cancel();
        }

        public async Task HandleChange(FileSystemChange result)
        {
            try
            {
                await HandleChangeCore(result);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Coś się wyjebało podczas aplikowania zmiany w FS XD");
            }
        }

        private async Task HandleChangeCore(FileSystemChange change)
        {
            var token = _cancellationTokenSource.Token;

            if (change.ChangeType != WatcherChangeTypes.Renamed)
            {
                await Task.Delay(TimeSpan.FromSeconds(1), token);
            }

            if (token.IsCancellationRequested)
            {
                throw new OperationCanceledException();
            }

            switch (change.ChangeType)
            {
                case WatcherChangeTypes.Created:
                case WatcherChangeTypes.Changed:
                    await _blogIndexer.UpdateOrAddAsync(change.Name);
                    break;

                case WatcherChangeTypes.Deleted:
                    _blogIndexer.Remove(change.Name);
                    break;

                case WatcherChangeTypes.Renamed when change.OldName is not null:
                    await _blogIndexer.RenameAsync(change.OldName, change.Name);
                    break;

                case WatcherChangeTypes.All:
                default:
                    throw new UnreachableException();
            }
        }

        public void Dispose()
        {
            Cancel();
            _cancellationTokenSource.Dispose();
        }
    }

    private record FileSystemChangeKey(string Name, bool IsRename);
    private record FileSystemChange(string Name, string? OldName, WatcherChangeTypes ChangeType);

    private class PendingChangesDictionary : ConcurrentDictionary<FileSystemChangeKey, ChangeHandler>
    {
        public void DisposeAll()
        {
            foreach (var changeHandler in Values)
            {
                changeHandler.Dispose();
            }
        }
    }
}
