namespace ScuroGuardiano.Net.Extensions;

public static class TypeExtensions
{
    extension(Type type)
    {
        public bool IsInstantiable()
        {
            return type is { IsAbstract: false, IsInterface: false, IsGenericTypeDefinition: false, ContainsGenericParameters: false }
                   && type.GetConstructor(Type.EmptyTypes) != null;
        }
    }
}
