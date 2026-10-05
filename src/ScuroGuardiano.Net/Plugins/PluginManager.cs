using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Loader;
using System.Security.Cryptography;
using ScuroGuardiano.Net.Abstractions;
using ScuroGuardiano.Net.Extensions;

namespace ScuroGuardiano.Net.Plugins;

public class PluginManager
{
    public IEnumerable<AbstractPlugin> Plugins => _plugins.Select(pe => pe.Plugin);
    public PluginAwareApplication? Application { get; set; }
    private readonly string[] _appArgs;

    private readonly List<PluginEntry> _plugins = [];

    public PluginManager(string[] args)
    {
        _appArgs = args;
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

    public async Task ReloadPluginsFromDirectoryAtRuntime(string directory)
    {
        var files = Directory.GetFiles(directory, "*.dll");
        foreach (var file in files)
        {
            await using var stream = File.OpenRead(file);
            await LoadPluginAtRuntime(file, stream, false);
        }

        Debug.Assert(Application is not null);

        if (!Application.IsActive)
        {
            await Application.CreateAndStart(_appArgs);
        }
    }

    public PluginManager PreloadPluginsFromDirectory(string directory)
    {
        if (Application?.IsActive == true)
        {
            throw new InvalidOperationException(
                $"Metoda {nameof(PreloadPluginsFromDirectory)} może być wywoałana tylko przed startem aplikacji.");
        }

        var files = Directory.GetFiles(directory, "*.dll");
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
                return; // Ten plugin już jest załadowany, nie musimy preloadować.
            }
        }

        Debug.Assert(Application is not null);

        if (Application.IsActive == true)
        {
            await Application.SoftShutdown();
        }

        // Jeżeli plugin nie istnieje to UnloadPlugin jest no-opem.
        await UnloadPlugin(aclName);
        await LoadPluginCore(aclName, stream);

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
        if (!registrationMetadata.PluginType.IsSubclassOf(typeof(AbstractPlugin)))
        {
            throw new ArgumentException($"Plugin {registrationMetadata.PluginType} is not a subclass of {typeof(AbstractPlugin)}");
        }

        var pluginInstance = (AbstractPlugin?)Activator.CreateInstance(registrationMetadata.PluginType);
        if (pluginInstance is null)
        {
            throw new ArgumentException($"Plugin {registrationMetadata.PluginType} is not instantiable");
        }

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

        _plugins.Add(new PluginEntry
        {
            Plugin = pluginInstance,
            IsRegisterStatically = false,
            AssemblyLoadContext = registrationMetadata.AssemblyLoadContext,
            DllSha256Hash = registrationMetadata.DllSha256Hash
        });
    }

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

        var weakAcl = new WeakReference(pluginEntry.AssemblyLoadContext);
        pluginEntry.AssemblyLoadContext!.Unload(); // ACL-ka nigdy nie będzie tu null.
        _plugins.Remove(pluginEntry);
        pluginEntry = null;

        for (int i = 0; weakAcl.IsAlive && i < 10; i++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
        }

        if (weakAcl.IsAlive)
        {
            // Coś dalej trzyma referencję do ACL.
            // SoftRestart aplikacji nie pomoże. Musimy zrestartować cały proces.
            Application.RestartProcess();
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
