using ScuroGuardiano.Net.Abstractions;

namespace ScuroGuardiano.Net.HelloPlugin;

public class Plugin : AbstractPlugin
{
    public override PluginIdentity Identity { get; } = new PluginIdentity("HelloPlugin", "1.0", "HelloPlugin", "Plugin that says Hello");

    public override IEnumerable<MenuEntry> MenuEntries
    {
        get
        {
            yield return new MenuEntry.AspPage("Hello", "Hello/Index", "Hello");
        }
    }
}
