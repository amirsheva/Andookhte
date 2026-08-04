using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Application.Common.Security;
using Andookhte.Domain.Entities.Identity;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

/* ————————————————— درخواست بازیابی ————————————————— */

/// <summary>
/// <c>Identifier</c> می‌تواند ایمیل یا شمارهٔ موبایل باشد.
/// پاسخ در هر حالت یکسان است تا فهرست کاربران ثبت‌شده لو نرود.
/// </summary>
public record RequestPasswordResetCommand(string Identifier) : IRequest<RequestOtpResultDto>;

public class RequestPasswordResetCommandHandler
    : IRequestHandler<RequestPasswordResetCommand, RequestOtpResultDto>
{
    private const int CodeLifetimeSeconds = 120;

    private readonly IAppDbContext _context;
    private readonly IOtpService _otp;

    public RequestPasswordResetCommandHandler(IAppDbContext context, IOtpService otp)
    {
        _context = context;
        _otp = otp;
    }

    public async Task<RequestOtpResultDto> Handle(
        RequestPasswordResetCommand request, CancellationToken cancellationToken)
    {
        var receiver = IdentityLookup.NormalizeIdentifier(request.Identifier);

        var exists = await _context.Users.AnyAsync(
            u => u.Email == receiver || u.PhoneNumber == receiver, cancellationToken);

        // کاربر ناموجود همان پاسخ موفق را می‌گیرد؛ فقط کدی صادر و ارسال نمی‌شود.
        if (!exists)
            return new RequestOtpResultDto(receiver, CodeLifetimeSeconds, null);

        var result = await _otp.IssueAsync(receiver, OtpPurpose.PasswordReset, cancellationToken);

        return new RequestOtpResultDto(receiver, result.ExpiresInSeconds, result.DevelopmentCode);
    }
}

/* ————————————————— تعیین رمز تازه ————————————————— */

public record ResetPasswordCommand(string Identifier, string Code, string NewPassword)
    : IRequest<AuthResultDto>;

public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, AuthResultDto>
{
    private const int MinimumPasswordLength = 8;

    private readonly IAppDbContext _context;
    private readonly IOtpService _otp;
    private readonly IPasswordHasher _hasher;
    private readonly IAuthSessionFactory _sessions;

    public ResetPasswordCommandHandler(
        IAppDbContext context, IOtpService otp, IPasswordHasher hasher, IAuthSessionFactory sessions)
    {
        _context = context;
        _otp = otp;
        _hasher = hasher;
        _sessions = sessions;
    }

    public async Task<AuthResultDto> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < MinimumPasswordLength)
            throw new ValidationException($"رمز عبور باید حداقل {MinimumPasswordLength} نویسه باشد.");

        var receiver = IdentityLookup.NormalizeIdentifier(request.Identifier);
        var code = OtpService.NormalizeCode(request.Code);

        await _otp.ConsumeAsync(receiver, OtpPurpose.PasswordReset, code, cancellationToken);

        var user = await _context.Users.FirstOrDefaultAsync(
            u => u.Email == receiver || u.PhoneNumber == receiver, cancellationToken)
            ?? throw new NotFoundException("کاربری با این مشخصات یافت نشد.");

        if (!user.IsActive)
            throw new ForbiddenException("این حساب غیرفعال شده است.");

        user.PasswordHash = _hasher.Hash(request.NewPassword);
        user.FailedLoginAttempts = 0;
        user.LockoutEndsAtUtc = null;

        // تغییر رمز باید همهٔ نشست‌های قبلی را بی‌اعتبار کند؛ در غیر این صورت
        // مهاجمی که توکن تمدید دزدیده، بعد از بازیابی رمز هم دسترسی‌اش را نگه می‌دارد.
        await RevokeAllSessions.ExecuteAsync(_context, user.Id, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return await _sessions.CreateAsync(user, cancellationToken);
    }
}

/* ————————————————— کمکی‌های مشترک ————————————————— */

internal static class IdentityLookup
{
    /// <summary>
    /// ورودی را به قالب یکسانِ ایمیل یا موبایل تبدیل می‌کند.
    /// چون همین مقدار به‌عنوان کلید گیرندهٔ کد ذخیره می‌شود، باید در صدور و
    /// مصرف دقیقاً یکسان نرمال شود.
    /// </summary>
    public static string NormalizeIdentifier(string? raw)
    {
        var phone = Normalizer.Phone(raw);
        if (Normalizer.IsValidIranianMobile(phone))
            return phone!;

        var email = Normalizer.Email(raw);
        if (Normalizer.IsValidEmail(email))
            return email!;

        throw new ValidationException("ایمیل یا شمارهٔ موبایل معتبر وارد کنید.");
    }
}

internal static class RevokeAllSessions
{
    public static async Task ExecuteAsync(
        IAppDbContext context, Guid userId, CancellationToken cancellationToken)
    {
        var active = await context.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in active)
            token.RevokedAtUtc = DateTime.UtcNow;
    }
}
