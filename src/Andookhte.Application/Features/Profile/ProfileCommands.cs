using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Application.Common.Security;
using Andookhte.Application.Features.Auth;
using Andookhte.Domain.Entities.Identity;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Profile;

public enum ContactChannel
{
    Phone = 1,
    Email = 2
}

/* ————————————————— ویرایش پروفایل ————————————————— */

/// <summary>
/// تغییر ایمیل یا موبایل، وضعیت تأیید همان مورد را صفر می‌کند —
/// وگرنه کاربر می‌توانست با ثبت ایمیل تأییدشدهٔ کسی دیگر، آن را تأییدشده جا بزند.
/// </summary>
public record UpdateProfileCommand(
    string DisplayName,
    string? Email = null,
    string? PhoneNumber = null
) : IRequest<UserDto>;

public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, UserDto>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUser _currentUser;

    public UpdateProfileCommandHandler(IAppDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<UserDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ValidationException("نام نمایشی را وارد کنید.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("کاربر یافت نشد.");

        var email = Normalizer.Email(request.Email);
        if (email is not null && !Normalizer.IsValidEmail(email))
            throw new ValidationException("ایمیل معتبر نیست.");

        var phone = Normalizer.Phone(request.PhoneNumber);
        if (phone is not null && !Normalizer.IsValidIranianMobile(phone))
            throw new ValidationException("شمارهٔ موبایل معتبر نیست.");

        // کاربر نباید هر دو راه ورود را از خودش بگیرد
        if (email is null && phone is null)
            throw new ValidationException("دست‌کم یکی از ایمیل یا شمارهٔ موبایل باید ثبت باشد.");

        if (email is null && user.PasswordHash is not null && phone is null)
            throw new ValidationException("حذف ایمیل بدون داشتن شمارهٔ موبایل ممکن نیست.");

        if (email != user.Email && email is not null &&
            await _context.Users.AnyAsync(u => u.Email == email && u.Id != userId, cancellationToken))
            throw new ConflictException("این ایمیل قبلاً ثبت شده است.");

        if (phone != user.PhoneNumber && phone is not null &&
            await _context.Users.AnyAsync(u => u.PhoneNumber == phone && u.Id != userId, cancellationToken))
            throw new ConflictException("این شمارهٔ موبایل قبلاً ثبت شده است.");

        if (email != user.Email)
        {
            user.Email = email;
            user.IsEmailConfirmed = false;
        }

        if (phone != user.PhoneNumber)
        {
            user.PhoneNumber = phone;
            user.IsPhoneConfirmed = false;
        }

        user.DisplayName = request.DisplayName.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        return AuthSessionFactory.ToDto(user);
    }
}

/* ————————————————— تغییر رمز ————————————————— */

/// <summary>
/// نشست تازه برمی‌گرداند. دلیلش این است که تغییر رمز همهٔ نشست‌های قبلی را باطل می‌کند
/// و بدون توکن تازه، خودِ کاربری که رمز را عوض کرده هم بیرون می‌افتاد.
/// </summary>
public record ChangePasswordCommand(string? CurrentPassword, string NewPassword)
    : IRequest<AuthResultDto>;

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, AuthResultDto>
{
    private const int MinimumPasswordLength = 8;

    private readonly IAppDbContext _context;
    private readonly ICurrentUser _currentUser;
    private readonly IPasswordHasher _hasher;
    private readonly IAuthSessionFactory _sessions;

    public ChangePasswordCommandHandler(
        IAppDbContext context, ICurrentUser currentUser, IPasswordHasher hasher, IAuthSessionFactory sessions)
    {
        _context = context;
        _currentUser = currentUser;
        _hasher = hasher;
        _sessions = sessions;
    }

    public async Task<AuthResultDto> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < MinimumPasswordLength)
            throw new ValidationException($"رمز عبور باید حداقل {MinimumPasswordLength} نویسه باشد.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("کاربر یافت نشد.");

        // کاربری که فقط با پیامک وارد شده هنوز رمزی ندارد و می‌تواند بدون رمز فعلی یکی تعیین کند
        if (user.PasswordHash is not null)
        {
            if (string.IsNullOrEmpty(request.CurrentPassword))
                throw new ValidationException("رمز فعلی را وارد کنید.");

            if (!_hasher.Verify(request.CurrentPassword, user.PasswordHash))
                throw new UnauthorizedException("رمز فعلی نادرست است.");
        }

        user.PasswordHash = _hasher.Hash(request.NewPassword);

        await RevokeAllSessions.ExecuteAsync(_context, user.Id, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return await _sessions.CreateAsync(user, cancellationToken);
    }
}

/* ————————————————— تأیید ایمیل و موبایل ————————————————— */

public record SendContactVerificationCommand(ContactChannel Channel) : IRequest<RequestOtpResultDto>;

public class SendContactVerificationCommandHandler
    : IRequestHandler<SendContactVerificationCommand, RequestOtpResultDto>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUser _currentUser;
    private readonly IOtpService _otp;

    public SendContactVerificationCommandHandler(
        IAppDbContext context, ICurrentUser currentUser, IOtpService otp)
    {
        _context = context;
        _currentUser = currentUser;
        _otp = otp;
    }

    public async Task<RequestOtpResultDto> Handle(
        SendContactVerificationCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("کاربر یافت نشد.");

        var receiver = ContactRules.Receiver(user, request.Channel);
        var purpose = request.Channel == ContactChannel.Phone
            ? OtpPurpose.PhoneConfirmation
            : OtpPurpose.EmailConfirmation;

        var result = await _otp.IssueAsync(receiver, purpose, cancellationToken);

        return new RequestOtpResultDto(receiver, result.ExpiresInSeconds, result.DevelopmentCode);
    }
}

public record ConfirmContactCommand(ContactChannel Channel, string Code) : IRequest<UserDto>;

public class ConfirmContactCommandHandler : IRequestHandler<ConfirmContactCommand, UserDto>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUser _currentUser;
    private readonly IOtpService _otp;

    public ConfirmContactCommandHandler(IAppDbContext context, ICurrentUser currentUser, IOtpService otp)
    {
        _context = context;
        _currentUser = currentUser;
        _otp = otp;
    }

    public async Task<UserDto> Handle(ConfirmContactCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("کاربر یافت نشد.");

        var receiver = ContactRules.Receiver(user, request.Channel);
        var purpose = request.Channel == ContactChannel.Phone
            ? OtpPurpose.PhoneConfirmation
            : OtpPurpose.EmailConfirmation;

        var code = OtpService.NormalizeCode(request.Code);
        await _otp.ConsumeAsync(receiver, purpose, code, cancellationToken);

        if (request.Channel == ContactChannel.Phone) user.IsPhoneConfirmed = true;
        else user.IsEmailConfirmed = true;

        await _context.SaveChangesAsync(cancellationToken);

        return AuthSessionFactory.ToDto(user);
    }
}

internal static class ContactRules
{
    public static string Receiver(User user, ContactChannel channel) => channel switch
    {
        ContactChannel.Phone => user.PhoneNumber
            ?? throw new ValidationException("ابتدا شمارهٔ موبایل را در پروفایل ثبت کنید."),
        ContactChannel.Email => user.Email
            ?? throw new ValidationException("ابتدا ایمیل را در پروفایل ثبت کنید."),
        _ => throw new ValidationException("کانال نامعتبر است.")
    };
}
