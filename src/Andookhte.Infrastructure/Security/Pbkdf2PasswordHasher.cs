using System.Security.Cryptography;
using Andookhte.Application.Common.Interfaces;

namespace Andookhte.Infrastructure.Security;

/// <summary>
/// هش رمز عبور با PBKDF2-HMAC-SHA256.
/// قالب ذخیره: <c>pbkdf2.sha256.{iterations}.{saltBase64}.{hashBase64}</c>
/// تعداد تکرار داخل خود رشته ذخیره می‌شود تا در آینده بدون بی‌اعتبارکردن رمزهای قدیمی قابل افزایش باشد.
/// (Base64 هرگز نقطه ندارد، بنابراین جداسازی با نقطه بدون ابهام است.)
/// </summary>
public class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int DefaultIterations = 210_000;
    private const string Algorithm = "pbkdf2";
    private const string Digest = "sha256";

    public string Hash(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, DefaultIterations, HashAlgorithmName.SHA256, HashSize);

        return string.Join('.',
            Algorithm,
            Digest,
            DefaultIterations,
            Convert.ToBase64String(salt),
            Convert.ToBase64String(hash));
    }

    public bool Verify(string password, string hash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hash))
            return false;

        var parts = hash.Split('.');
        if (parts.Length != 5) return false;
        if (parts[0] != Algorithm || parts[1] != Digest) return false;
        if (!int.TryParse(parts[2], out var iterations) || iterations <= 0) return false;

        byte[] salt;
        byte[] expected;
        try
        {
            salt = Convert.FromBase64String(parts[3]);
            expected = Convert.FromBase64String(parts[4]);
        }
        catch (FormatException)
        {
            return false;
        }

        if (salt.Length == 0 || expected.Length == 0) return false;

        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);

        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
