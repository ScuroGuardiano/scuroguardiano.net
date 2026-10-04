namespace ScuroGuardiano.Net.Extensions;

public static class HeaderDictionaryExtensions
{
    extension(IHeaderDictionary headers)
    {
        public bool DatastarRequest => headers["Datastar-Request"] == "true";
    }
}
