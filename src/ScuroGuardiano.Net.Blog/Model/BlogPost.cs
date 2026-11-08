namespace ScuroGuardiano.Net.Blog.Model;

public class BlogPost
{
    public required string Title { get; set; }
    public required string Slug { get; set; }
    public required string FileName { get; set; }
    public string[] Tags { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset PublishedAt { get; set; }
}
