using System.Diagnostics.CodeAnalysis;
using System.IO.Compression;
using Microsoft.AspNetCore.ResponseCompression;
using ScuroGuardiano.Net.Helpers;
using ScuroGuardiano.Net.Plugins;
using StarFederation.Datastar.DependencyInjection;

namespace ScuroGuardiano.Net;

public class PluginAwareApplication
{
    public bool IsActive => _webApplication is not null;
    private readonly PluginManager _pluginManager;
    private WebApplication? _webApplication;

    public PluginAwareApplication(PluginManager pluginManager)
    {
        _pluginManager = pluginManager;
        _pluginManager.Application = this;
    }

    public async Task CreateAndStart(string[] args)
    {
        if (IsActive)
        {
            throw new InvalidOperationException("Application has already been started");
        }

        await Configure(args);
        await Startup();
    }

    public async Task Configure(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddSingleton(_pluginManager);

        foreach (var plugin in _pluginManager.Plugins)
        {
            builder.Services.AddSingleton(plugin.GetType(), plugin);
            builder.Services.AddKeyedSingleton(plugin, plugin.Identity.Id);
            await plugin.RegisterServicesAsync(builder.Services);
            await plugin.ConfigureAsync(builder.Services, builder.Configuration);
        }

        var mvcBuilder = builder.Services.AddRazorPages();
        foreach (var plugin in _pluginManager.Plugins)
        {
            Console.WriteLine($"Registering plugin { plugin.Identity.Name }");
            mvcBuilder.AddApplicationPart(plugin.GetType().Assembly);
        }

        builder.Services.AddDatastar();
        builder.Services.AddScoped<CustomRazorRenderer>();

        builder.Services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
        });

        builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Fastest;
        });

        builder.Services.Configure<GzipCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.SmallestSize;
        });


        _webApplication = builder.Build();
    }

    public async Task Startup()
    {
        if (_webApplication is null)
        {
            throw new InvalidOperationException("Application has not been build yet");
        }

        var app = _webApplication;

        // Configure the HTTP request pipeline.
        if (!app.Environment.IsDevelopment())
        {
            app.UseExceptionHandler("/Error");
            // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
            app.UseHsts();
        }

        app.UseRouting();

        app.UseAuthorization();

        app.MapStaticAssets();
        app.MapRazorPages()
            .WithStaticAssets();

        await app.RunAsync();
    }

    public async Task SoftShutdown()
    {
        if (_webApplication is not null)
        {
            await _webApplication.StopAsync(TimeSpan.FromSeconds(30));
            await _webApplication.DisposeAsync();
            _webApplication = null;
        }
    }

    [DoesNotReturn]
    public async void RestartProcess()
    {
        try
        {
            await SoftShutdown();
        }
        finally
        {
            // TODO: Execve
        }
    }
}
