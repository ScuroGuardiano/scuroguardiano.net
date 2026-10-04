using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace ScuroGuardiano.Net.TagHelpers;

/// <summary>
/// Doczepia soft-navigation Datastara (pushState + @get) do linków.
/// Działa również z asp-page, asp-action etc.
/// </summary>
[HtmlTargetElement("a", Attributes = "data-boost")]
public class DatastarBoostAnchorTagHelper : TagHelper
{
    // Default = 0, co i tak jest po AnchorTagHelperze (Order = -1000) - zostawione jawnie dla czytelności.
    public override int Order => 0;

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        // Pozwól ręcznie nadpisać/wyłączyć zachowanie per-link: <a asp-page="X" data-on:click="...">
        if (output.Attributes.ContainsName("data-on:click"))
            return;

        var href = output.Attributes["href"]?.Value?.ToString();
        if (string.IsNullOrEmpty(href))
            return;

        // Kodowanie pod kątem osadzenia w JS-owym stringu w atrybucie - href zwykle jest bezpieczny
        // (generowany przez routing), ale jeśli w grę wchodzą asp-route-* z danymi użytkownika,
        // to broni przed wyrwaniem się z cudzysłowu / wstrzyknięciem JS-a.
        var safeHref = JavaScriptEncoder.Default.Encode(href);

        var expression = $"history.pushState(null, '', '{safeHref}'); @get('{safeHref}')";

        output.Attributes.RemoveAll("data-boost");
        output.Attributes.SetAttribute("data-on:click__prevent", expression);
    }
}

