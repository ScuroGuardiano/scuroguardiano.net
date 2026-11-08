using System.ComponentModel.DataAnnotations;

namespace ScuroGuardiano.Net.Blog;

public class BlogOptions
{
    public const string Section = "Blog";

    [Required]
    public required string PostsDirectory { get; set; }
}
