using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace ScuroGuardiano.Net.Helpers;

public class CustomRazorRenderer
{
    private readonly IRazorViewEngine _razorViewEngine;
    private ITempDataProvider _tempDataProvider;

    public CustomRazorRenderer(IRazorViewEngine razorViewEngine, ITempDataProvider tempDataProvider)
    {
        _razorViewEngine = razorViewEngine;
        _tempDataProvider = tempDataProvider;
    }

    public async Task<string> RenderViewToStringAsync<TModel>(string viewName, TModel model,
        ActionContext actionContext, bool isPartial)
    {
        using var sw = new StringWriter();

        var viewResult = _razorViewEngine.FindView(actionContext, viewName, !isPartial);
        if (viewResult.View == null)
        {
            throw new ArgumentException($"{viewName} is not found");
        }

        var viewDictionary =
            new ViewDataDictionary(new EmptyModelMetadataProvider(),
                    new ModelStateDictionary())
                { Model = model };

        var viewContext = new ViewContext(
            actionContext,
            viewResult.View,
            viewDictionary,
            new TempDataDictionary(actionContext.HttpContext, _tempDataProvider),
            sw,
            new HtmlHelperOptions()
        );

        await viewResult.View.RenderAsync(viewContext);
        return sw.ToString();
    }
}
