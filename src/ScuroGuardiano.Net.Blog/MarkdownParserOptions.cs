namespace ScuroGuardiano.Net.Blog;

public class MarkdownParserOptions
{
    public const string Section = "Blog:MarkdownParser";
    public int FrontMatterMaxSize { get; set; } = 1024;
}
