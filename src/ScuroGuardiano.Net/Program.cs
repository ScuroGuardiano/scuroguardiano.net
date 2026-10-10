using Microsoft.Extensions.Logging;
using ScuroGuardiano.Net;
using ScuroGuardiano.Net.Helpers;
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

EvilSoftRestartCleanupHacks.BindLogger(loggerFactory.CreateLogger<EvilSoftRestartCleanupHacks>());
var pluginManager = new PluginManager(loggerFactory.CreateLogger<PluginManager>(), "/home/scuroguardiano/projects/scuroguardiano.net/src/ScuroGuardiano.Net/bin/Release/net11.0/linux-x64/publish/plugins/");
pluginManager.ReloadPluginsAtRuntime();

var app = new RestartableApplication(args, pluginManager, loggerFactory.CreateLogger<RestartableApplication>());
await app.CreateAndStart();

// Żeby po wyjściu głównego wątku proces nie zdechł
await Task.Delay(Timeout.Infinite);
