namespace ScuroGuardiano.Net.Blog.Model;

public class BlogPostFrontMatter
{
    public required string Title { get; set; }
    public string[] Tags { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset PublishedAt { get; set; }
}
