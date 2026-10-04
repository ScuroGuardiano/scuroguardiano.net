using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ScuroGuardiano.Net.Extensions;
using ScuroGuardiano.Net.Helpers;
using StarFederation.Datastar.DependencyInjection;

namespace ScuroGuardiano.Net.Pages.Blog;

public class BlogIndexModel : PageModel
{
    private readonly IDatastarService _datastarService;
    private readonly CustomRazorRenderer _razorRenderer;

    public BlogIndexModel(IDatastarService datastarService, CustomRazorRenderer razorRenderer)
    {
        _datastarService = datastarService;
        _razorRenderer = razorRenderer;
    }

    public IActionResult OnGet()
    {
        return Page();
    }
}
