using ScuroGuardiano.Net;
using ScuroGuardiano.Net.Plugins;


var pluginManager = new PluginManager(args);
pluginManager.PreloadPluginsFromDirectory("plugins");

var app = new PluginAwareApplication(pluginManager);
await app.CreateAndStart(args);
