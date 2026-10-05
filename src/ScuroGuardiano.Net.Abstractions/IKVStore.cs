using System.Transactions;

namespace ScuroGuardiano.Net.Abstractions;

// ReSharper disable once InconsistentNaming
public interface IKVStore<TPlugin>
    where TPlugin : AbstractPlugin
{
    public Task SetAsync<T>(string key, T value);
    public Task<T> GetAsync<T>(string key);
    public Task RemoveAsync(string key);

    public Task<Transaction> BeginTransactionAsync();
}
