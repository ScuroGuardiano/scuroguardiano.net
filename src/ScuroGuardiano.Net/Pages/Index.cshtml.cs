using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ScuroGuardiano.Net.Plugins;
using StarFederation.Datastar.DependencyInjection;

namespace ScuroGuardiano.Net.Pages;

[IgnoreAntiforgeryToken]
public class IndexModel : PageModel
{
  public void OnGet()
  {
      HttpContext.Response.Headers.CacheControl = "public, max-age=3600";
  }

  public IActionResult OnPostReloadPlugins([FromServices] PluginManager pluginManager)
  {
      using (ExecutionContext.SuppressFlow())
      {
          Task.Run(pluginManager.UnloadAllPlugins);
      }
      return Content(
          /*language=javascript*/
          """
          (async () => {
              while (true) {
                  await new Promise(r => setTimeout(r, 1000));
                  try {
                      if ((await fetch('/', { method: 'GET' })).ok) {
                          window.location.reload();
                          break;
                      }
                  }
                  catch {}
                  await new Promise(r => setTimeout(r, 1000));
              }
          })()
          """,
          "text/javascript"
      );
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
