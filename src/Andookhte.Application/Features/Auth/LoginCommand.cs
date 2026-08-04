using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Application.Common.Security;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

public record LoginCommand(string Email, string Password) : IRequest<AuthResultDto>;

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    private readonly IAppDbContext _context;
    private readonly IPasswordHasher _hasher;
    private readonly IAuthSessionFactory _sessions;

    public LoginCommandHandler(IAppDbContext context, IPasswordHasher hasher, IAuthSessionFactory sessions)
    {
        _context = context;
        _hasher = hasher;
        _sessions = sessions;
    }

    public async Task<AuthResultDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var email = Normalizer.Email(request.Email);

        var user = email is null
            ? null
            : await _context.Users.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        // پیام خطا برای «کاربر نیست» و «رمز غلط» یکسان است تا فهرست ایمیل‌های ثبت‌شده لو نرود
        if (user is null || user.PasswordHash is null)
            throw new UnauthorizedException("ایمیل یا رمز عبور نادرست است.");

        if (!user.IsActive)
            throw new ForbiddenException("این حساب غیرفعال شده است.");

        if (user.LockoutEndsAtUtc is { } lockoutEnd && lockoutEnd > DateTime.UtcNow)
        {
            var minutes = Math.Max(1, (int)Math.Ceiling((lockoutEnd - DateTime.UtcNow).TotalMinutes));
            throw new TooManyRequestsException($"به دلیل تلاش‌های ناموفق، حساب تا {minutes} دقیقهٔ دیگر قفل است.");
        }

        if (!_hasher.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= MaxFailedAttempts)
            {
                user.LockoutEndsAtUtc = DateTime.UtcNow.Add(LockoutDuration);
                user.FailedLoginAttempts = 0;
            }
            await _context.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedException("ایمیل یا رمز عبور نادرست است.");
        }

        return await _sessions.CreateAsync(user, cancellationToken);
    }
}
