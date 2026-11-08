namespace ScuroGuardiano.Net.Blog.Services;

public class MarkdownParserOptions
{
    public const string Section = "Blog:MarkdownParser";
    public int FrontMatterMaxSize { get; set; } = 1024;
}
