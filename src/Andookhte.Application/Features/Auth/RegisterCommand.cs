using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Application.Common.Security;
using Andookhte.Domain.Entities.Identity;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

public record RegisterCommand(
    string Email,
    string Password,
    string DisplayName,
    string? PhoneNumber = null
) : IRequest<AuthResultDto>;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResultDto>
{
    private const int MinimumPasswordLength = 8;

    private readonly IAppDbContext _context;
    private readonly IPasswordHasher _hasher;
    private readonly IAuthSessionFactory _sessions;

    public RegisterCommandHandler(IAppDbContext context, IPasswordHasher hasher, IAuthSessionFactory sessions)
    {
        _context = context;
        _hasher = hasher;
        _sessions = sessions;
    }

    public async Task<AuthResultDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var email = Normalizer.Email(request.Email);
        if (!Normalizer.IsValidEmail(email))
            throw new ValidationException("ایمیل معتبر نیست.");

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < MinimumPasswordLength)
            throw new ValidationException($"رمز عبور باید حداقل {MinimumPasswordLength} نویسه باشد.");

        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ValidationException("نام نمایشی را وارد کنید.");

        var phone = Normalizer.Phone(request.PhoneNumber);
        if (phone is not null && !Normalizer.IsValidIranianMobile(phone))
            throw new ValidationException("شمارهٔ موبایل معتبر نیست.");

        if (await _context.Users.AnyAsync(u => u.Email == email && !u.IsDeleted, cancellationToken))
            throw new ConflictException("این ایمیل قبلاً ثبت شده است.");

        if (phone is not null &&
            await _context.Users.AnyAsync(u => u.PhoneNumber == phone && !u.IsDeleted, cancellationToken))
            throw new ConflictException("این شمارهٔ موبایل قبلاً ثبت شده است.");

        var user = new User
        {
            Email = email,
            PhoneNumber = phone,
            PasswordHash = _hasher.Hash(request.Password),
            DisplayName = request.DisplayName.Trim()
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        return await _sessions.CreateAsync(user, cancellationToken);
    }
}
