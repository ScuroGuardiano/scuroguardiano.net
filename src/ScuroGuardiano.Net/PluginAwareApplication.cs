using System.Diagnostics.CodeAnalysis;
using System.IO.Compression;
using Microsoft.AspNetCore.ResponseCompression;
using ScuroGuardiano.Net.Helpers;
using ScuroGuardiano.Net.Plugins;
using ScuroGuardiano.Phoenix;
using StarFederation.Datastar.DependencyInjection;

namespace ScuroGuardiano.Net;

public class PluginAwareApplication
{
    public bool IsActive => _webApplication is not null;
    private readonly PluginManager _pluginManager;
    private WebApplication? _webApplication;
    private ILogger<PluginAwareApplication> _logger;

    public PluginAwareApplication(PluginManager pluginManager, ILogger<PluginAwareApplication> logger)
    {
        _pluginManager = pluginManager;
        _pluginManager.Application = this;
        _logger = logger;
    }

    public async Task CreateAndStart(string[] args)
    {
        if (IsActive)
        {
            throw new InvalidOperationException("Application has already been started");
        }

        _logger.LogInformation("Startuję aplikację...");

        await Configure(args);
        await Startup();
    }

    public async Task Configure(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddSingleton(_pluginManager);

        // builder.Services.AddSerilog();

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

        // app.UseSerilogRequestLogging();
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

        await app.StartAsync();
    }

    public async Task SoftShutdown()
    {
        _logger.LogInformation("Wyłączam WebApplication...");

        var application = Interlocked.Exchange(ref _webApplication, null);

        if (application is null)
        {
            return;
        }

        await application.StopAsync(TimeSpan.FromSeconds(30));
        await application.DisposeAsync();

        _logger.LogInformation("WebApplication wyłączona.");
    }

    [DoesNotReturn]
    public async void RestartProcess()
    {
        try
        {
            _logger.LogInformation("Restartuję proces...");
            await SoftShutdown();
            if (!OperatingSystem.IsLinux())
            {
                throw new InvalidOperationException("Jebać OS bez execve");
            }
            SacrificialArson.Instance.SelfExecve();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fuck: {ExceptionMessage}", ex.ToString());
            Environment.Exit(1);
        }
    }
}
