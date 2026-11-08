using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ScuroGuardiano.Net.Blog.Model;

namespace ScuroGuardiano.Net.Blog.Services;

internal class BlogService
{
    private readonly ILogger<BlogService> _logger;
    private BlogOptions _options;
    private readonly BlogIndexer _blogIndexer;

    public BlogService(ILogger<BlogService> logger, IOptionsSnapshot<BlogOptions> options, BlogIndexer blogIndexer)
    {
        _logger = logger;
        _options = options.Value;
        _blogIndexer = blogIndexer;
    }

    public IReadOnlyList<BlogPost> ListBlogPosts()
    {
        return _blogIndexer.Posts.Values
            .OrderByDescending(p => p.CreatedAt)
            .ToArray();
    }
}
