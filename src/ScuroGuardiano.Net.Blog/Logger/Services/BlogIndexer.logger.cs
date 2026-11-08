using Microsoft.Extensions.Logging;

namespace ScuroGuardiano.Net.Blog.Services;

internal partial class BlogIndexer
{
    [LoggerMessage(LogLevel.Information, "Posty zostały zindeksowane: {PostsDirectory}")]
    partial void LogPostsHaveBeenIndexed(string postsDirectory);

    [LoggerMessage(LogLevel.Error, "Post {PostFile} nie zawiera poprawnego front matter, zostaje zignorowany")]
    partial void LogPostInvalidFrontMatter(string postFile);

    [LoggerMessage(LogLevel.Error, "Post {PostFile} nie posiada poprawnego tytułu, zostaje zignorowany")]
    partial void LogPostInvalidTitle(string postFile);

    [LoggerMessage(LogLevel.Error, "Wystąpił błąd podczas indeksowania pliku {PostFile}, zostaje zignorowany. Dane błędu: {ExceptionStringified}")]
    partial void LogPostFileIndexException(string postFile, string exceptionStringified, Exception exception);

    [LoggerMessage(LogLevel.Error, "Wystąpił błąd podczas indeksowania postów: {IndexError}")]
    partial void LogIndexingError(string indexError, Exception exception);

    [LoggerMessage(LogLevel.Error, "Post o slugu {PostSlug} z pliku {PostFile} ma kolidujący slug z innym postem. Popraw tytuł")]
    partial void LogPostSlugCollision(string postSlug, string postFile);

    [LoggerMessage(LogLevel.Error, "Wystąpił błąd podczas aktualizacji pliku {PostFile}: {ExceptionStringified}")]
    partial void LogPostUpdateException(string postFile, string exceptionStringified, Exception exception);

    [LoggerMessage(LogLevel.Information, "Post {PostFile} - {PostSlug} został zaaktualizowany")]
    partial void LogPostHasBeenUpdated(string postFile, string postSlug);

    [LoggerMessage(LogLevel.Information, "Slug posta {PostFile} się zmienił z {OldPostSlug} na {PostSlug}. Zostanie on usunięty i dodany na nowo")]
    partial void LogPostRemoveOnSlugChangeDuringUpdate(string postFile, string oldPostSlug, string postSlug);

    [LoggerMessage(LogLevel.Information, "Post {PostFile} - {PostSlug} został dodany")]
    partial void LogPostHasBeedAdded(string postFile, string postSlug);

    [LoggerMessage(LogLevel.Information, "Post {PostFile} - {PostSlug} został usunięty")]
    partial void LogPostHasBeenRemoved(string postFile, string postSlug);
}
