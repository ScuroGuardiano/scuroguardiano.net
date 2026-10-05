namespace ScuroGuardiano.Net.Abstractions;

/// <summary>
/// <para>
/// Na chwilę obecną zwraca jedynie ścieżkę do katalogu,
/// w którym plugin powinien przechowywać swoje pliki.
/// </para>
/// <para>
/// Nie ma tu większej abstracji na wszystkie operacje I/O,
/// bo YAGNI. Raczej nie będę używał ObjectStorage póki co.
/// </para>
/// </summary>
/// <typeparam name="TPlugin">Typ pluginu. Każdy plugin dostaje własną ścieżkę</typeparam>
public interface IFileStore<TPlugin>
    where TPlugin: AbstractPlugin
{
    /// <summary>
    /// Zwraca ścieżkę, w której plugin powinien przechowywać swoje dane.
    /// </summary>
    /// <returns>Scieżka do katalogu</returns>
    public string GetPluginDirectoryPath();
}
