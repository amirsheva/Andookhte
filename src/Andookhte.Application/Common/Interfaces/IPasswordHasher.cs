namespace Andookhte.Application.Common.Interfaces;

public interface IPasswordHasher
{
    /// <summary>هش PBKDF2 با نمک تصادفی. خروجی شامل الگوریتم، تکرار، نمک و هش است.</summary>
    string Hash(string password);

    bool Verify(string password, string hash);
}
