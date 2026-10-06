using Microsoft.Extensions.Logging;
using ScuroGuardiano.Net;
using ScuroGuardiano.Net.Plugins;
using Serilog;
using Serilog.Events;
using Serilog.Extensions.Logging;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft.AspNetCore.Hosting", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore.Mvc", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore.Routing", LogEventLevel.Warning)
    .WriteTo.Console()
    .CreateLogger();

using var loggerFactory = new SerilogLoggerFactory(Log.Logger);

var pluginManager = new PluginManager(args, loggerFactory.CreateLogger<PluginManager>(), "/home/scuroguardiano/projects/scuroguardiano.net/src/ScuroGuardiano.Net/bin/Release/net11.0/linux-x64/publish/plugins/");
pluginManager.PreloadPlugins();

var app = new PluginAwareApplication(pluginManager, loggerFactory.CreateLogger<PluginAwareApplication>());
await app.CreateAndStart(args);

// Żeby po wyjściu głównego wątku proces nie zdechł
using (ExecutionContext.SuppressFlow())
{
    await Task.Delay(10000);
    await Task.Delay(Timeout.Infinite);
}
