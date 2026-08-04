using System.Security.Cryptography;
using System.Text;
using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

public record OtpIssueResult(int ExpiresInSeconds, string? DevelopmentCode);

public interface IOtpService
{
    /// <summary>صدور کد تازه، ابطال کدهای قبلی همان گیرنده و ارسال آن.</summary>
    Task<OtpIssueResult> IssueAsync(string receiver, OtpPurpose purpose, CancellationToken cancellationToken = default);

    /// <summary>اعتبارسنجی و مصرف کد. در صورت نامعتبر بودن استثنا می‌دهد.</summary>
    Task ConsumeAsync(string receiver, OtpPurpose purpose, string code, CancellationToken cancellationToken = default);
}

/// <summary>
/// چرخهٔ عمر کد یک‌بارمصرف در یک نقطه جمع شده تا ورود، بازیابی رمز و تأیید شماره
/// همگی از یک منطق (مهلت، سقف تلاش، بازهٔ ارسال مجدد، هش‌کردن) استفاده کنند.
/// </summary>
public class OtpService : IOtpService
{
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);
    private const int MaxAttempts = 5;

    private readonly IAppDbContext _context;
    private readonly ITokenService _tokens;
    private readonly IOtpSender _sender;

    public OtpService(IAppDbContext context, ITokenService tokens, IOtpSender sender)
    {
        _context = context;
        _tokens = tokens;
        _sender = sender;
    }

    public async Task<OtpIssueResult> IssueAsync(
        string receiver, OtpPurpose purpose, CancellationToken cancellationToken = default)
    {
        var cooldownStart = DateTime.UtcNow.Subtract(ResendCooldown);

        var recent = await _context.OtpCodes
            .Where(o => o.Receiver == receiver && o.Purpose == purpose && o.CreatedAtUtc > cooldownStart)
            .OrderByDescending(o => o.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (recent is not null)
        {
            var wait = Math.Max(1,
                (int)Math.Ceiling((recent.CreatedAtUtc.Add(ResendCooldown) - DateTime.UtcNow).TotalSeconds));
            throw new TooManyRequestsException($"تا {wait} ثانیهٔ دیگر امکان درخواست کد جدید نیست.");
        }

        // کدهای قبلی باطل می‌شوند تا همیشه فقط آخرین کد معتبر باشد
        var previous = await _context.OtpCodes
            .Where(o => o.Receiver == receiver && o.Purpose == purpose && o.ConsumedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var code in previous)
            code.ConsumedAtUtc = DateTime.UtcNow;

        var plainCode = GenerateNumericCode();

        _context.OtpCodes.Add(new OtpCode
        {
            Receiver = receiver,
            Purpose = purpose,
            CodeHash = _tokens.HashToken(plainCode),
            ExpiresAtUtc = DateTime.UtcNow.Add(CodeLifetime)
        });

        await _context.SaveChangesAsync(cancellationToken);
        await _sender.SendAsync(receiver, plainCode, purpose, cancellationToken);

        return new OtpIssueResult(
            (int)CodeLifetime.TotalSeconds,
            _sender.ExposesCodeInResponse ? plainCode : null);
    }

    public async Task ConsumeAsync(
        string receiver, OtpPurpose purpose, string code, CancellationToken cancellationToken = default)
    {
        var otp = await _context.OtpCodes
            .Where(o => o.Receiver == receiver && o.Purpose == purpose && o.ConsumedAtUtc == null)
            .OrderByDescending(o => o.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (otp is null)
            throw new UnauthorizedException("کدی برای این گیرنده صادر نشده است. دوباره درخواست دهید.");

        if (DateTime.UtcNow >= otp.ExpiresAtUtc)
            throw new UnauthorizedException("کد منقضی شده است. دوباره درخواست دهید.");

        if (otp.AttemptCount >= MaxAttempts)
            throw new TooManyRequestsException("تعداد تلاش‌های نادرست زیاد بود. کد جدید درخواست دهید.");

        if (!FixedTimeEquals(otp.CodeHash, _tokens.HashToken(code)))
        {
            otp.AttemptCount++;
            await _context.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedException("کد تأیید نادرست است.");
        }

        otp.ConsumedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>کد شش‌رقمی با مولد تصادفی امن رمزنگاری.</summary>
    private static string GenerateNumericCode()
        => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    /// <summary>مقایسهٔ زمان‌ثابت برای جلوگیری از حملهٔ زمان‌سنجی روی هش کد.</summary>
    private static bool FixedTimeEquals(string left, string right)
        => CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(left),
            Encoding.UTF8.GetBytes(right));

    /// <summary>نرمال‌سازی و اعتبارسنجی قالب کد وارد‌شده توسط کاربر.</summary>
    public static string NormalizeCode(string? raw)
    {
        var digits = Common.Security.Normalizer.ToLatinDigits(raw ?? string.Empty).Trim();

        if (digits.Length != 6 || !digits.All(char.IsDigit))
            throw new ValidationException("کد تأیید باید شش رقم باشد.");

        return digits;
    }
}
