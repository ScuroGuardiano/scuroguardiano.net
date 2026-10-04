namespace ScuroGuardiano.Net.Extensions;

public static class HttpContextExtensions
{
    extension(HttpContext httpContext)
    {
        public bool IsDatastarRequest => httpContext.Request.Headers.DatastarRequest;
    }
}
