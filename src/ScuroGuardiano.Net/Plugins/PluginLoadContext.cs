using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.Loader;
using System.Security.Cryptography;
using ScuroGuardiano.Net.Abstractions;
using ScuroGuardiano.Net.Extensions;

namespace ScuroGuardiano.Net.Plugins;

internal class PluginLoadContext : AssemblyLoadContext
{
    private PluginLoadContext(string name, string dllSha256Hash) : base(name, isCollectible: true)
    {
        DllSha256Hash = dllSha256Hash;
    }

    /// <summary>
    /// Hash DLL-ki pluginu w base64
    /// </summary>
    public string DllSha256Hash { get; private set; }

    // Klasa napisana jest w taki sposób aby sytuacja z ALC bez nazwy nie była możliwa.
    public new string Name
    {
        get
        {
            Debug.Assert(base.Name is not null);
            return base.Name;
        }
    }

    public Type PluginType { get; private set; } = null!;

    private Assembly? _assembly;

    /// <summary>
    /// Ładuje nową assembly pluginu tylko jeżeli DLL-ka ze strumienia się zmieniła
    /// w porównaniu do istniejącego kontekstu.
    /// <b>Metoda nie wywołuje <see cref="Unload"/> na istniejącym kontekście</b>
    /// </summary>
    /// <param name="existing">Istniejący <see cref="PluginLoadContext"/> z tej samej DLL</param>
    /// <param name="stream">Strumień z zawartością DLL-ki</param>
    /// <returns>Nowy <see cref="PluginLoadContext"/> jeżeli DLL-ka się zmieniła, w przeciwnym razie null</returns>
    public static PluginLoadContext? LoadFromStreamIfDifferent(PluginLoadContext existing, Stream stream)
    {
        ThrowIfStreamNotSeekable(stream);
        var sha256 = CalculateSha256Hash(stream);
        if (existing.DllSha256Hash == sha256)
        {
            return null;
        }

        // Klasa napisana jest w taki sposób aby sytuacja z ALC bez nazwy nie była możliwa.
        Debug.Assert(existing.Name is not null);
        return LoadFromSteam(existing.Name, stream);
    }

    public static PluginLoadContext LoadFromSteam(string alcName, Stream stream)
    {
        ThrowIfStreamNotSeekable(stream);

        var sha256 = CalculateSha256Hash(stream);
        stream.Seek(0, SeekOrigin.Begin);

        var plc = new PluginLoadContext(alcName, sha256);
        try
        {
            // Pierdolony kurwa C# wykrywa metodę statyczną i ignoruje przeładowanie w instancji
            plc.LoadFromStreamProxy(stream);
            return plc;
        }
        catch
        {
            plc.Unload();
            throw;
        }
    }

    /// <summary>
    /// <para>
    /// Po wywołaniu tej metody pozbądź się wszelkich referencji do niej.
    /// </para>
    /// <para>
    /// <see cref="AssemblyLoadContext"/> wciąż może nie zostać odładowane, jeżeli gdzieś w procesie
    /// są trzymane referencje do typów/instancji pochodzących z załadowanej <see cref="Assembly"/>.
    /// Generalnie to w pizdu ciężko się pozbyć tego, jeżeli zostało użyte gdzieś w ASP.NET Core.
    /// </para>
    /// </summary>
    /// <returns><see cref="WeakReference"/> do tej instancji</returns>
    public new WeakReference Unload()
    {
        base.Unload();
        return new WeakReference(_assembly, true);
    }

    private Assembly LoadFromStreamProxy(Stream stream)
    {
        return LoadFromStream(stream);
    }

    private new Assembly LoadFromStream(Stream stream)
    {
        var asm = base.LoadFromStream(stream);
        _assembly = asm;

        var pluginTypes = asm.GetExportedTypes()
            .Where(t => t.IsSubclassOf(typeof(AbstractPlugin)) && t.IsInstantiable())
            .ToList();

        if (pluginTypes.Count > 1)
        {
            throw new InvalidOperationException(
                $"W assembly {asm.FullName} znaleziono więcej niż jedną instancjonowalną klasę pluginu."
                + " Sytuacja niedopuszczalna, gdyż tylko jedna instancja pluginu zostanie utworzona na Assembly,"
                + " prowadząc w ten sposób do Undefined Behaviour");
        }

        var pluginType = pluginTypes.FirstOrDefault();

        PluginType = pluginType ?? throw new ArgumentException(
            $"Assembly {asm.FullName} nie zawiera możliwego do instancjonowania typu pluginu");

        return asm;
    }

    private static string CalculateSha256Hash(Stream stream)
    {
        var sha256 = SHA256.HashData(stream);
        return Convert.ToBase64String(sha256);
    }

    private static void ThrowIfStreamNotSeekable(Stream stream, [CallerMemberName] string methodName = "")
    {
        if (!stream.CanSeek)
        {
            throw new InvalidOperationException(
                $"Strumień przekazany metodzie {methodName} musi być Seekable." +
                " Przekopiuj strumień do pamięci, jeżeli nie masz seekable.");
        }
    }
}
