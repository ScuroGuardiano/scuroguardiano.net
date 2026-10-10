using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using ScuroGuardiano.Net.Abstractions;
using ScuroGuardiano.Net.Extensions;

namespace ScuroGuardiano.Net.Plugins;

public sealed class PluginManager
{
    public IReadOnlyList<AbstractPlugin> Plugins => _plugins.Select(pe => pe.Plugin).ToList();
    public PluginGraveyard PluginGraveyard { get; } = new();

    private readonly List<PluginEntry> _plugins = [];
    private readonly ILogger<PluginManager> _logger;
    private readonly string _pluginsDirectory;

    public PluginManager(ILogger<PluginManager> logger, string pluginsDirectory)
    {
        _logger = logger;
        _pluginsDirectory = pluginsDirectory;

        Directory.CreateDirectory(pluginsDirectory);
    }

    [MethodImpl(MethodImplOptions.Synchronized)]
    public void RegisterPlugin<TPlugin>()
        where TPlugin : AbstractPlugin, new()
    {
        _plugins.Add(new PluginEntry
        {
            Plugin = new TPlugin()
        });
    }

    [MethodImpl(MethodImplOptions.Synchronized)]
    public void ReloadPluginsAtRuntime()
    {
        _logger.LogInformation("Przeładowywanie pluginów w trakcie działania działania aplikacji");

        var files = Directory.GetFiles(_pluginsDirectory, "*.dll");

        _logger.LogInformation("Znaleziono {FilesLength} pluginów", files.Length);

        foreach (var file in files)
        {
            using var stream = File.OpenRead(file);
            LoadPluginAtRuntime(file, stream);
        }

        _logger.LogInformation("Przeładowanie pluginów na gorąco zostało zakończone pomyślnie");
    }

    [MethodImpl(MethodImplOptions.Synchronized)]
    public void UnloadAllPlugins()
    {
        _logger.LogInformation("Odładowywanie pluginów...");

        // Musimy tutaj zrobić kopię pluginów, które odładowujemy
        // Bo metoda UnloadPlugin usuwa wpis z listy _plugins
        var unloadablePlugins = _plugins
            .Where(pe => pe.IsRegisterStatically)
            .ToList();

        for (int i = 0; i < unloadablePlugins.Count; i++)
        {
            var pluginEntry = unloadablePlugins[i];
            UnloadPlugin(ref pluginEntry);
        }

        _logger.LogInformation("Pluginy odładowane");
    }

    [MethodImpl(MethodImplOptions.Synchronized)]
    public void LoadPluginAtRuntime(string alcName, Stream stream)
    {
        var pluginEntry = _plugins.FirstOrDefault(pe => pe.PluginLoadContext?.Name == alcName);
        if (pluginEntry is not null)
        {
            ReloadPluginAtRuntime(pluginEntry, stream);
        }
        else
        {
            LoadNewPluginAtRuntime(alcName, stream);
        }

        _logger.LogInformation("Przeładowanie pluginu o nazwie ACL: {AclName} zakończone", alcName);
    }

    private void ReloadPluginAtRuntime(PluginEntry pluginEntry, Stream stream)
    {
        if (pluginEntry.IsRegisterStatically)
        {
            throw new InvalidOperationException("Nie można przeładowywać pluginów zarejestrowanych statycznie.");
        }

        var newPluginContext =
            PluginLoadContext.LoadFromStreamIfDifferent(pluginEntry.PluginLoadContext, stream);

        if (newPluginContext is null)
        {
            _logger.LogInformation("Plugin {PluginId} ({DllHash}) się nie zmienił. Pomijam",
                pluginEntry.Plugin.Identity.Id, pluginEntry.PluginLoadContext.DllSha256Hash);
            return;
        }

        UnloadPlugin(ref pluginEntry!);

        pluginEntry = new PluginEntry
        {
            Plugin = newPluginContext.InstantiatePlugin(),
            PluginLoadContext = newPluginContext
        };

        _plugins.Add(pluginEntry);
    }

    private void LoadNewPluginAtRuntime(string alcName, Stream stream)
    {
        var pluginLoadContext = PluginLoadContext.LoadFromSteam(alcName, stream);
        var instance = pluginLoadContext.InstantiatePlugin();

        CheckForDuplicatePlugin(instance);

        var pluginEntry = new PluginEntry
        {
            Plugin = pluginLoadContext.InstantiatePlugin(),
            PluginLoadContext = pluginLoadContext
        };
        _plugins.Add(pluginEntry);
    }

    private void CheckForDuplicatePlugin(AbstractPlugin pluginInstance)
    {
        var existingPlugin = _plugins.FirstOrDefault(pe => pe.Plugin.Identity.Id == pluginInstance.Identity.Id);
        if (existingPlugin is not null)
        {
            throw new InvalidOperationException($"Plugin o ID {existingPlugin.Plugin.Identity.Id} już istnieje." +
                                                " Sprawdź czy nie masz zduplikowanych pluginów w folderze z pluginami.");
        }
    }

    /// <summary>
    /// Odładowuje plugin, usuwa go z listy <see cref="_plugins"/>
    /// <br/><br/><b>NIE WYWOŁUJ TEJ METODY Z WNĘTRZA ITERACJI PO <see cref="_plugins"/></b>
    /// </summary>
    /// <param name="pluginEntry">Wpis pluginu, zostanie ustawiony na null po wyjściu z metody</param>
    /// <exception cref="InvalidOperationException">Plugin załadowany statycznie, których to nie można odładować.</exception>
    [MethodImpl(MethodImplOptions.NoInlining)]
    private void UnloadPlugin([MaybeNull] ref PluginEntry pluginEntry)
    {
        if (pluginEntry.IsRegisterStatically)
        {
            throw new InvalidOperationException("Pluginu załadowanego statycznie nie można odładować.");
        }

        // Remove from list
        _plugins.Remove(pluginEntry);
        var pluginLoadContext = pluginEntry.PluginLoadContext;
        PluginGraveyard.SendToEternalRest(ref pluginLoadContext);
        pluginEntry = null!;
    }


    private class PluginEntry
    {
        /// <summary>
        /// Instancja pluginu
        /// </summary>
        public required AbstractPlugin Plugin { get; init; }

        /// <summary>
        /// AssemblyLoadContext z dodatkami, do którego został załadowany plugin.
        /// Zawiera w sobie SHA256 w base64 DLL-ki pluginu oraz <see cref="Type"/> implementujący <see cref="AbstractPlugin"/>
        /// z danej DLL-ki.
        /// </summary>
        /// <remarks>
        /// Wartość jest null w przypadku statycznie ładowanych pluginów
        /// </remarks>
        public PluginLoadContext? PluginLoadContext { get; init; }

        /// <summary>
        /// Czy plugin został załadowany statycznie, tzn. z użyciem <see cref="RegisterPlugin&lt;TPlugin&gt;"/>
        /// </summary>
        [MemberNotNullWhen(false, nameof(PluginLoadContext))]
        public bool IsRegisterStatically => PluginLoadContext is null;
    }
}
