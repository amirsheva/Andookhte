using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Andookhte.Infrastructure.Security;

public class JwtTokenService : ITokenService
{
    private readonly JwtOptions _options;
    private readonly SigningCredentials _credentials;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;

        if (string.IsNullOrWhiteSpace(_options.SigningKey) || _options.SigningKey.Length < 32)
        {
            throw new InvalidOperationException(
                "کلید امضای JWT تنظیم نشده یا کوتاه‌تر از ۳۲ نویسه است. " +
                "مقدار Jwt:SigningKey را در تنظیمات یا متغیر محیطی قرار دهید.");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        _credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    }

    public TimeSpan RefreshTokenLifetime => TimeSpan.FromDays(_options.RefreshTokenDays);

    public AccessToken CreateAccessToken(User user)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("display_name", user.DisplayName)
        };

        if (!string.IsNullOrWhiteSpace(user.Email))
            claims.Add(new Claim(JwtRegisteredClaimNames.Email, user.Email));

        if (!string.IsNullOrWhiteSpace(user.PhoneNumber))
            claims.Add(new Claim(JwtRegisteredClaimNames.PhoneNumber, user.PhoneNumber));

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: _credentials);

        var value = new JwtSecurityTokenHandler().WriteToken(token);

        return new AccessToken(value, expiresAt, _options.AccessTokenMinutes * 60);
    }

    /// <summary>۶۴ بایت تصادفی با کدگذاری Base64Url — بدون نویسهٔ نیازمند escape در URL.</summary>
    public string GenerateRefreshToken()
        => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(64));

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
