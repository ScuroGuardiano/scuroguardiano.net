using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using ScuroGuardiano.Net.Abstractions;
using ScuroGuardiano.Net.Extensions;

namespace ScuroGuardiano.Net.Plugins;

public class PluginManager
{
    public IReadOnlyList<AbstractPlugin> Plugins => _plugins.Select(pe => pe.Plugin).ToList();
    public PluginAwareApplication? Application { get; set; }
    private readonly string[] _appArgs;

    private readonly List<PluginEntry> _plugins = [];
    private readonly ILogger<PluginManager> _logger;
    private readonly string _pluginsDirectory;

    public PluginManager(string[] args, ILogger<PluginManager> logger, string pluginsDirectory)
    {
        _appArgs = args;
        _logger = logger;
        _pluginsDirectory = pluginsDirectory;

        Directory.CreateDirectory(pluginsDirectory);
    }

    public void RegisterPlugin<TPlugin>()
        where TPlugin : AbstractPlugin, new()
    {
        _plugins.Add(new PluginEntry
        {
            Plugin = new TPlugin(),
            IsRegisterStatically = true
        });
    }

    public async Task ReloadPluginsAtRuntime()
    {
        _logger.LogInformation("Przeładowywanie pluginów w trakcie działania działania aplikacji.");

        var files = Directory.GetFiles(_pluginsDirectory, "*.dll");

        _logger.LogInformation("Znaleziono {FilesLength} pluginów.", files.Length);

        foreach (var file in files)
        {
            await using var stream = File.OpenRead(file);
            await LoadPluginAtRuntime(file, stream, false);
        }

        Debug.Assert(Application is not null);

        _logger.LogInformation("Przeładowanie pluginów na gorąco zostało zakończone pomyślnie.");
        if (!Application.IsActive)
        {
            await Application.CreateAndStart(_appArgs);
        }
    }

    public async Task UnloadAllPlugins()
    {
        _logger.LogInformation("Odładowywanie pluginów");

        await Application!.SoftShutdown();
        var unloadablePlugins = _plugins.Where(pe => pe.AssemblyLoadContext is not null).ToList();
        for (int i = 0; i < unloadablePlugins.Count; i++)
        {
            var pluginEntry = unloadablePlugins[i];
            string alcName = pluginEntry.AssemblyLoadContext!.Name!;
            pluginEntry = null;
            unloadablePlugins[i] = null!;
            GC.Collect();
            GC.WaitForPendingFinalizers();
            await UnloadPlugin(alcName);
        }

        await Application.CreateAndStart(_appArgs);

        _logger.LogInformation("Pluginy odładowane");
        // await Task.Factory.StartNew(
        //     async () =>
        //     {
        //     },
        //     CancellationToken.None,
        //     TaskCreationOptions.DenyChildAttach,
        //     TaskScheduler.Default
        // ).Unwrap();
    }

    public PluginManager PreloadPlugins()
    {
        if (Application?.IsActive == true)
        {
            throw new InvalidOperationException(
                $"Metoda {nameof(PreloadPlugins)} może być wywoałana tylko przed startem aplikacji.");
        }

        var files = Directory.GetFiles(_pluginsDirectory, "*.dll");
        foreach (var file in files)
        {
            using var stream = File.OpenRead(file);
            PreloadPluginFromStream(file, stream);
        }

        return this;
    }

    public PluginManager PreloadPluginFromStream(string aclName, Stream stream)
    {
        if (Application?.IsActive == true)
        {
            throw new InvalidOperationException(
                $"Metoda {nameof(PreloadPluginFromStream)} może być wywołana tylko przed startem aplikacji.");
        }

        PreloadPluginCore(aclName, stream);

        return this;
    }

    public async Task LoadPluginAtRuntime(string aclName, Stream stream, bool startApplication = true)
    {
        if (!stream.CanSeek)
        {
            throw new InvalidOperationException(
                $"Strumień przekazany metodzie {nameof(LoadPluginAtRuntime)} musi być Seekable." +
                " Przekopiuj strumień do pamięci, jeżeli nie masz seekable.");
        }

        // Sprawdźmy czy plugin istnieje i czy jego hash się nie zmienił.
        // W takim wypadku nie będziemy musieli przeładowywać pluginu.
        var existingPlugin = _plugins.FirstOrDefault(pe => pe.AssemblyLoadContext?.Name == aclName);
        if (existingPlugin is not null)
        {
            var hash = Convert.ToBase64String(await SHA256.HashDataAsync(stream));
            stream.Seek(0, SeekOrigin.Begin);
            if (existingPlugin.DllSha256Hash == hash)
            {
                _logger.LogInformation("Plugin {PluginId} ({DllHash}) się nie zmienił. Pomijam.",
                    existingPlugin.Plugin.Identity.Id, existingPlugin.DllSha256Hash);
                return; // Ten plugin już jest załadowany, nie musimy preloadować.
            }
        }

        existingPlugin = null;

        Debug.Assert(Application is not null);

        _logger.LogInformation("Przeładowuję plugin o nazwie ACL: {AclName}", aclName);

        if (Application.IsActive)
        {
            await Application.SoftShutdown();
        }

        // Jeżeli plugin nie istnieje to UnloadPlugin jest no-opem.
        await UnloadPlugin(aclName);
        await LoadPluginCore(aclName, stream);

        _logger.LogInformation("Przeładowanie pluginu o nazwie ACL: {AclName} zakończone.", aclName);

        if (startApplication)
        {
            await Application!.CreateAndStart(_appArgs);
        }
    }

    private void PreloadPluginCore(string aclName, Stream stream)
    {
        RegisterPluginAtPreload(LoadAclFromStream(aclName, stream));
    }

    private async Task LoadPluginCore(string aclName, Stream stream)
    {
        await RegisterPluginAtRuntime(LoadAclFromStream(aclName, stream));
    }

    private PluginDynamicRegistrationMetadata LoadAclFromStream(string aclName, Stream stream)
    {
        if (!stream.CanSeek)
        {
            throw new InvalidOperationException(
                $"Strumień przekazany metodzie {nameof(LoadAclFromStream)} musi być Seekable." +
                " Przekopiuj strumień do pamięci, jeżeli nie masz seekable.");
        }

        var assemblyLoadContext = new AssemblyLoadContext(aclName, true);

        string sha256Hash = Convert.ToBase64String(SHA256.HashData(stream));
        stream.Seek(0, SeekOrigin.Begin);
        var asm = assemblyLoadContext.LoadFromStream(stream);

        var pluginType = asm.GetExportedTypes()
            .FirstOrDefault(t => t.IsSubclassOf(typeof(AbstractPlugin)) && t.IsInstantiable());

        if (pluginType is null)
        {
            // Hopefully zostanie odładowane. Nie mam na to gwarancji, ale jedyne referencje trzymające te ACL-kę są w tym scopie.
            assemblyLoadContext.Unload();
            asm = null;
            assemblyLoadContext = null;
            GC.Collect();
            GC.WaitForPendingFinalizers();

            throw new InvalidOperationException("Podany montaż nie zawiera typu pluginu.");
        }

        return new PluginDynamicRegistrationMetadata(pluginType, assemblyLoadContext, sha256Hash);
    }

    private void RegisterPluginAtPreload(PluginDynamicRegistrationMetadata registrationMetadata)
    {
        if (!registrationMetadata.PluginType.IsSubclassOf(typeof(AbstractPlugin)))
        {
            throw new ArgumentException($"Plugin {registrationMetadata.PluginType} is not a subclass of {typeof(AbstractPlugin)}");
        }

        var pluginInstance = (AbstractPlugin?)Activator.CreateInstance(registrationMetadata.PluginType);
        if (pluginInstance is null)
        {
            throw new ArgumentException($"Plugin {registrationMetadata.PluginType} is not instantiable");
        }

        // Sprawdźmy czy plugin już istnieje
        var existingPlugin = _plugins.FirstOrDefault(pe => pe.Plugin.Identity.Id == pluginInstance.Identity.Id);
        if (existingPlugin is not null)
        {
            // Jesteśmy w tym momencie na etapie preloada. Czyli aplikacja jeszcze nie wystartowała.
            // W tej sytuacji, jeżeli napotkamy zduplikowany plugin, to jest to zwyczajnie błąd.
            // Sytuacja typu - dwa pluginy o takim samym ID w folderze pluginów.
            // Jebiemy zatem wyjątkiem.
            throw new InvalidOperationException($"Plugin o ID {existingPlugin.Plugin.Identity.Id} już istnieje." +
                                                " Sprawdź czy nie masz zduplikowanych pluginów w folderze z pluginami.");
        }

        _plugins.Add(new PluginEntry
        {
            Plugin = pluginInstance,
            IsRegisterStatically = false,
            AssemblyLoadContext = registrationMetadata.AssemblyLoadContext,
            DllSha256Hash = registrationMetadata.DllSha256Hash
        });
    }

    private async Task RegisterPluginAtRuntime(PluginDynamicRegistrationMetadata registrationMetadata)
    {
        _logger.LogInformation("Rejestruję plugin typu {PluginTypeName} o nazwie ACL {AclName} ({DllSha256}) na gorąco",
            registrationMetadata.PluginType.FullName, registrationMetadata.AssemblyLoadContext.Name,
            registrationMetadata.DllSha256Hash);

        if (!registrationMetadata.PluginType.IsSubclassOf(typeof(AbstractPlugin)))
        {
            throw new ArgumentException($"Plugin {registrationMetadata.PluginType} is not a subclass of {typeof(AbstractPlugin)}");
        }

        var pluginInstance = (AbstractPlugin?)Activator.CreateInstance(registrationMetadata.PluginType);
        if (pluginInstance is null)
        {
            throw new ArgumentException($"Plugin {registrationMetadata.PluginType} is not instantiable");
        }

        {
            // Check if plugin already exists
            var existingPlugin = _plugins.FirstOrDefault(pe => pe.Plugin.Identity.Id == pluginInstance.Identity.Id);
            if (existingPlugin is not null)
            {
                if (existingPlugin.IsRegisterStatically || existingPlugin.AssemblyLoadContext is null)
                {
                    throw new InvalidOperationException(
                        $"Plugin o ID {pluginInstance.Identity.Id} jest już zarejestrowany statycznie." +
                        " Nie można podmienić zarejestrowanego statycznie pluginu na dynamiczny." +
                        $" Dynamiczny plugin {pluginInstance.Identity.Id} zostaje zignorowany.");
                }

                // Jeżeli plugin nie jest zarejestrowany statycznie, to możemy go unloadować
                // Musimy jednak pozbyć się referencji do niego, bo będzie trzymał ACL-kę.
                var existingPluginAclName = existingPlugin.AssemblyLoadContext.Name!;
                existingPlugin = null;
                await UnloadPlugin(existingPluginAclName);
            }
        }

        _plugins.Add(new PluginEntry
        {
            Plugin = pluginInstance,
            IsRegisterStatically = false,
            AssemblyLoadContext = registrationMetadata.AssemblyLoadContext,
            DllSha256Hash = registrationMetadata.DllSha256Hash
        });

        _logger.LogInformation(
            "Plugin typu {PluginTypeName} o nazwie ACL {AclName} i ID {PluginId} został zarejestrowany",
            registrationMetadata.PluginType.FullName, registrationMetadata.AssemblyLoadContext.Name,
            pluginInstance.Identity.Id);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private async Task UnloadPlugin(string aclName)
    {
        var pluginEntry = _plugins.FirstOrDefault(pe => !pe.IsRegisterStatically && pe.AssemblyLoadContext?.Name == aclName);
        if (pluginEntry is null)
        {
            return; // Brak pluginu - nie trzeba unloadować
        }

        Debug.Assert(Application is not null);
        // Zatrzymujemy aplikację, bo ona na pewno trzyma referencję do ACL-ki
        await Application.SoftShutdown();

        _logger.LogInformation("Odładowuję ACL-kę {AclName}...", aclName);
        pluginEntry.AssemblyLoadContext!.Unload(); // ACL-ka nigdy nie będzie tu null.
        var weakAcl = new WeakReference(pluginEntry.AssemblyLoadContext, true);
        _plugins.Remove(pluginEntry);
        pluginEntry = null;

        CollectAssemblyLoadContext(weakAcl);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private void CollectAssemblyLoadContext(WeakReference weakAcl)
    {

        PurgeStaticTypeCache("Microsoft.Extensions.Internal.PropertyHelper", "PropertiesCache",
            "VisiblePropertiesCache");

        for (int i = 0; weakAcl.IsAlive && i < 10; i++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
        }

        if (weakAcl.IsAlive)
        {
            _logger.LogError(
                "Coś trzyma referencję do ALC, uniemożliwiając lekkie przeładowanie. Wymagany jest restart procesu.");

            // Application.RestartProcess();
        }
        else
        {
            _logger.LogInformation("ALC została odładowana.");
        }
    }

    private void PurgeStaticTypeCache(string typeFullName, params string[] fieldNames)
    {
        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            var type = asm.GetType(typeFullName);
            if (type is null) continue;

            foreach (var fieldName in fieldNames)
            {
                try
                {
                    var field = type.GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Static);
                    if (field?.GetValue(null) is System.Collections.IDictionary dict)
                        dict.Clear();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Nie udało się wyczyścić {Field} z {Type} w {Assembly}",
                        fieldName, typeFullName, asm.FullName);
                }
            }
        }
    }

    private class PluginEntry
    {
        /// <summary>
        /// Instancja pluginu
        /// </summary>
        public required AbstractPlugin Plugin { get; init; }

        /// <summary>
        /// ALC pluginu do obsługi unloadu. Ustawione tylko dla pluginów załadowanych dynamicznie.
        /// Pluginów dołączonych statycznie nie można unloadować, bo są dołączone w głównym ACL.
        /// </summary>
        public AssemblyLoadContext? AssemblyLoadContext { get; init; }

        /// <summary>
        /// Czy plugin został załadowany statycznie, tzn. z użyciem <see cref="RegisterPlugin&lt;TPlugin&gt;"/>
        /// </summary>
        public bool IsRegisterStatically { get; init; } = false;

        /// <summary>
        /// Hash DLL-ki pluginu. Jeżeli plugin jest zarejestrowany statycznie to będzie nullem.
        /// </summary>
        public string? DllSha256Hash { get; init; }
    }

    private class PluginDynamicRegistrationMetadata
    {
        [SetsRequiredMembers]
        public PluginDynamicRegistrationMetadata(Type pluginType, AssemblyLoadContext assemblyLoadContext,
            string dllSha256Hash)
        {
            PluginType = pluginType;
            AssemblyLoadContext = assemblyLoadContext;
            DllSha256Hash = dllSha256Hash;
        }

        public required Type PluginType { get; init; }
        public required AssemblyLoadContext AssemblyLoadContext { get; init; }
        public required string DllSha256Hash { get; init; }
    }
}
