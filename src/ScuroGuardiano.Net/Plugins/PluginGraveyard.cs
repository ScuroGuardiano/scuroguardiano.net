using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;

namespace ScuroGuardiano.Net.Plugins;

/// <summary>
/// Nie bój się, dobrze wykorzystam Twoje zwłoki
/// </summary>
internal class PluginGraveyard
{
    private readonly ConcurrentDictionary<int, GraveyardEntry> _deadPlugins = new();
    private int _lastIdx = 0;

    /// <summary>
    /// <para>
    /// Wysyła dany <see cref="PluginLoadContext"/> na wieczny spoczynek.
    /// Przekazany argument zostanie nullem po wyjściu z metody.
    /// </para>
    /// <para>
    /// Nie ma jednak gwarancji na to, że cały kontekst zostanie odładowany.
    /// Patrz <see cref="PluginLoadContext.Unload"/>
    /// </para>
    /// </summary>
    /// <param name="pluginLoadContext">Plugin, który ma się udać na wieczny spoczynek</param>
    public void SendToEternalRest([MaybeNull] ref PluginLoadContext pluginLoadContext)
    {
        var name = pluginLoadContext.Name;
        var weakRef = pluginLoadContext.Unload();

        _deadPlugins.TryAdd(Interlocked.Increment(ref _lastIdx), new GraveyardEntry(name, weakRef));

        pluginLoadContext = null;
    }

    public void RemoveUnloaded()
    {
        foreach (var entry in _deadPlugins)
        {
            if (!entry.Value.WeakRef.IsAlive)
            {
                _deadPlugins.TryRemove(entry.Key, out _);
            }
        }
    }

    public List<string> GetStillAlivePluginAlcNames()
    {
        return _deadPlugins.Values
            .Where(entry => entry.WeakRef.IsAlive)
            .Select(entry => entry.Name)
            .ToList();
    }

    private record GraveyardEntry(string Name, WeakReference WeakRef);
}
