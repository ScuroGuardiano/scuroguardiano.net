using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ScuroGuardiano.Net.Abstractions;

public abstract class AbstractPlugin
{
    public abstract PluginIdentity Identity { get; }
    public virtual IEnumerable<PluginDependency> Dependencies { get; } = [];

    public virtual Task RegisterServicesAsync(IServiceCollection services)
    {
        return Task.CompletedTask;
    }

    public virtual Task ConfigureAsync(IServiceCollection services, IConfiguration configuration)
    {
        return Task.CompletedTask;
    }

    public virtual IEnumerable<MenuEntry> MenuEntries { get; } = [];
}
