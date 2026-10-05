using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ScuroGuardiano.Net.Plugins;
using StarFederation.Datastar.DependencyInjection;

namespace ScuroGuardiano.Net.Pages;

public class IndexModel : PageModel
{
  public void OnGet()
  {
      HttpContext.Response.Headers.CacheControl = "public, max-age=3600";
  }

  public IActionResult OnPostReloadPlugins([FromServices] PluginManager pluginManager)
  {
      Task.Run(() => pluginManager.ReloadPluginsFromDirectoryAtRuntime("plugins"));
      return Content( /*language=javascript*/ "setTimeout(() => window.location.reload(), 5000)", "text/javascript");
  }

  public IActionResult OnGetSalami()
  {
      return Partial("_Salami", new Dictionary<string, string> { ["Salami"] = "Wykurwiste" });
  }

  public IActionResult OnGetSalamiJson()
  {
      return new JsonResult(new { Salami = "Jsonowe" });
  }

  public IActionResult OnGetSalamiJavascript()
  {
      return Content("alert('Salami jest w pytę')", "text/javascript");
  }

  public async Task<IActionResult> OnGetSalamiStream([FromServices] IDatastarService datastarService)
  {
      await datastarService.PatchElementsAsync(@"<div id=""salami"">Salami nr Jeden</div>");
      await Task.Delay(1000);
      await datastarService.PatchElementsAsync(@"<div id=""salami"">Salami nr Dwa</div>");
      await Task.Delay(1000);
      await datastarService.PatchElementsAsync(@"<div id=""salami"">Salami nr Trzy</div>");

      return new EmptyResult();
  }
}
