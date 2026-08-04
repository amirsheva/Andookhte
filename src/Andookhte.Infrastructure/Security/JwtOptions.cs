namespace Andookhte.Infrastructure.Security;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>کلید امضا. در تولید باید از متغیر محیطی یا Secret Manager خوانده شود، نه از appsettings.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public string Issuer { get; set; } = "Andookhte";
    public string Audience { get; set; } = "Andookhte.Client";

    /// <summary>عمر توکن دسترسی به دقیقه — کوتاه، چون با توکن تمدید جایگزین می‌شود.</summary>
    public int AccessTokenMinutes { get; set; } = 15;

    /// <summary>عمر توکن تمدید به روز.</summary>
    public int RefreshTokenDays { get; set; } = 30;
}
