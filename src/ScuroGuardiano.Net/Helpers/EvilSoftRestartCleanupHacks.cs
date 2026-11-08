using System.Reflection;

namespace ScuroGuardiano.Net.Helpers;

internal abstract class EvilSoftRestartCleanupHacks
{
    private static ILogger<EvilSoftRestartCleanupHacks>? _logger;

    public static void BindLogger(ILogger<EvilSoftRestartCleanupHacks> logger)
    {
        _logger = logger;
    }

    // ReSharper disable once InvalidXmlDocComment
    /// <summary>
    /// Czyści statyczny cache z klasy <see cref="Microsoft.Extensions.Internal.PropertyHelper"/>
    /// </summary>
    public static void PurgePropertyHelperStaticTypeCache()
    {
        PurgeStaticTypeCache("Microsoft.Extensions.Internal.PropertyHelper", "PropertiesCache",
            "VisiblePropertiesCache");
    }

    /// <summary>
    /// Czyści statyczne cache, które sobie Microsoft wymyślił.
    /// </summary>
    /// <param name="typeFullName"></param>
    /// <param name="fieldNames"></param>
    public static void PurgeStaticTypeCache(string typeFullName, params string[] fieldNames)
    {
        foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
        {
            var type = asm.GetType(typeFullName);
            if (type is null) continue;

            foreach (var fieldName in fieldNames)
            {
                try
                {
                    var field = type.GetField(fieldName, BindingFlags.NonPublic | BindingFlags.Static);
                    if (field?.GetValue(null) is System.Collections.IDictionary dict)
                        dict.Clear();
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Nie udało się wyczyścić {Field} z {Type} w {Assembly}",
                        fieldName, typeFullName, asm.FullName);
                }
            }
        }
    }
}
