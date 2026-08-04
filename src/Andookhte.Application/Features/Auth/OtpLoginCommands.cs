using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Application.Common.Security;
using Andookhte.Domain.Entities.Identity;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

/* ————————————————— درخواست کد ورود ————————————————— */

public record RequestOtpCommand(string PhoneNumber) : IRequest<RequestOtpResultDto>;

public class RequestOtpCommandHandler : IRequestHandler<RequestOtpCommand, RequestOtpResultDto>
{
    private readonly IOtpService _otp;

    public RequestOtpCommandHandler(IOtpService otp) => _otp = otp;

    public async Task<RequestOtpResultDto> Handle(RequestOtpCommand request, CancellationToken cancellationToken)
    {
        var phone = Normalizer.Phone(request.PhoneNumber);
        if (!Normalizer.IsValidIranianMobile(phone))
            throw new ValidationException("شمارهٔ موبایل معتبر نیست. نمونهٔ درست: ۰۹۱۲۱۲۳۴۵۶۷");

        var result = await _otp.IssueAsync(phone!, OtpPurpose.Login, cancellationToken);

        return new RequestOtpResultDto(phone!, result.ExpiresInSeconds, result.DevelopmentCode);
    }
}

/* ————————————————— تأیید کد ورود ————————————————— */

/// <summary>
/// اگر کاربری با این شماره نباشد، همین‌جا ساخته می‌شود
/// تا ورود و ثبت‌نام با پیامک یک مسیر واحد داشته باشند.
/// </summary>
public record VerifyOtpCommand(string PhoneNumber, string Code, string? DisplayName = null)
    : IRequest<AuthResultDto>;

public class VerifyOtpCommandHandler : IRequestHandler<VerifyOtpCommand, AuthResultDto>
{
    private readonly IAppDbContext _context;
    private readonly IOtpService _otp;
    private readonly IAuthSessionFactory _sessions;

    public VerifyOtpCommandHandler(IAppDbContext context, IOtpService otp, IAuthSessionFactory sessions)
    {
        _context = context;
        _otp = otp;
        _sessions = sessions;
    }

    public async Task<AuthResultDto> Handle(VerifyOtpCommand request, CancellationToken cancellationToken)
    {
        var phone = Normalizer.Phone(request.PhoneNumber);
        if (!Normalizer.IsValidIranianMobile(phone))
            throw new ValidationException("شمارهٔ موبایل معتبر نیست.");

        var code = OtpService.NormalizeCode(request.Code);
        await _otp.ConsumeAsync(phone!, OtpPurpose.Login, code, cancellationToken);

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.PhoneNumber == phone!, cancellationToken);

        if (user is null)
        {
            user = new User
            {
                PhoneNumber = phone,
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName)
                    ? "کاربر اندوخته"
                    : request.DisplayName.Trim(),
                IsPhoneConfirmed = true
            };
            _context.Users.Add(user);
        }
        else
        {
            if (!user.IsActive)
                throw new ForbiddenException("این حساب غیرفعال شده است.");
            user.IsPhoneConfirmed = true;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await _sessions.CreateAsync(user, cancellationToken);
    }
}
