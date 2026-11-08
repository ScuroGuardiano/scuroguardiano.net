using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ScuroGuardiano.Net.Abstractions;
using ScuroGuardiano.Net.Blog.BackgroundJobs;
using ScuroGuardiano.Net.Blog.Services;
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
        services.AddSingleton<Services.BlogIndexer>();
        services.AddSingleton(new SlugifierBuilder()
            .CollapseReplacement()
            .Build()
        );

        services.AddHostedService<BlogDirectoryWatcher>();

        return Task.CompletedTask;
    }

    public override async Task BeforeStartAsync(IServiceProvider services)
    {
        var blogPostsDirectory = services.GetRequiredService<IOptions<BlogOptions>>().Value.PostsDirectory;
        if (!Directory.Exists(blogPostsDirectory))
        {
            Directory.CreateDirectory(blogPostsDirectory);
        }

        var blogIndexer = services.GetRequiredService<Services.BlogIndexer>();
        await blogIndexer.IndexAsync();
    }

    public override IEnumerable<MenuEntry> MenuEntries
    {
        get
        {
            yield return new MenuEntry.AspPage("Blog", "Index", "Blog");
        }
    }
}
