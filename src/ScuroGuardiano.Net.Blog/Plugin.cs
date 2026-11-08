using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ScuroGuardiano.Net.Abstractions;
using ScuroGuardiano.Slugify;

namespace ScuroGuardiano.Net.Blog;

public class Plugin : AbstractPlugin
{
    public override PluginIdentity Identity { get; } = new("ScuroGuardiano.Net.Blog", "1.0.0", "Blog", "Mój blog");

    public override Task ConfigureAsync(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<BlogOptions>()
            .BindConfiguration(BlogOptions.Section)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<MarkdownParserOptions>()
            .BindConfiguration(MarkdownParserOptions.Section)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton<MarkdownParser>();
        services.AddSingleton<BlogIndexer>();
        services.AddSingleton(new SlugifierBuilder()
            .CollapseReplacement()
            .Build()
        );

        services.AddHostedService<BlogDirectoryWatcher>();

        return Task.CompletedTask;
    }

    public override IEnumerable<MenuEntry> MenuEntries
    {
        get
        {
            yield return new MenuEntry.AspPage("Blog", "Index", "Blog");
        }
    }
}
