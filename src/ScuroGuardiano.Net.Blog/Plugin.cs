using ScuroGuardiano.Net.Abstractions;

namespace ScuroGuardiano.Net.Blog;

public class Plugin : AbstractPlugin
{
    public override PluginIdentity Identity { get; } = new("ScuroGuardiano.Net.Blog", "1.0.0", "Blog", "Mój blog xD");

    public override IEnumerable<MenuEntry> MenuEntries
    {
        get
        {
            yield return new MenuEntry.AspPage("Blog", "Index", "Blog");
        }
    }
}
