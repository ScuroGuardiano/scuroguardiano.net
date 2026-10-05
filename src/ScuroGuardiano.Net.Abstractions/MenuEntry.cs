using JetBrains.Annotations;

namespace ScuroGuardiano.Net.Abstractions;

public closed record MenuEntry(string Label)
{
    public sealed record AspPage(string Label, string Page, [AspMvcArea] string Area) : MenuEntry(Label);
    public sealed record Link(string Label, string Url, bool OpenInNewTab = false) : MenuEntry(Label);
    public sealed record PartialElement([AspMvcPartialView] string Partial) : MenuEntry("");
}
