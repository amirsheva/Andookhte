using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

public record RefreshTokenCommand(string RefreshToken) : IRequest<AuthResultDto>;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResultDto>
{
    private readonly IAppDbContext _context;
    private readonly ITokenService _tokens;
    private readonly IAuthSessionFactory _sessions;

    public RefreshTokenCommandHandler(IAppDbContext context, ITokenService tokens, IAuthSessionFactory sessions)
    {
        _context = context;
        _tokens = tokens;
        _sessions = sessions;
    }

    public async Task<AuthResultDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new UnauthorizedException("توکن تمدید ارسال نشده است.");

        var hash = _tokens.HashToken(request.RefreshToken);

        var stored = await _context.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, cancellationToken);

        if (stored is null)
            throw new UnauthorizedException("توکن تمدید نامعتبر است.");

        // استفادهٔ مجدد از توکن باطل‌شده یعنی توکن احتمالاً دزدیده شده؛
        // برای احتیاط همهٔ نشست‌های فعال کاربر باطل می‌شوند.
        if (stored.RevokedAtUtc is not null)
        {
            await RevokeAllSessionsAsync(stored.UserId, cancellationToken);
            throw new UnauthorizedException("این توکن قبلاً استفاده شده است. لطفاً دوباره وارد شوید.");
        }

        if (DateTime.UtcNow >= stored.ExpiresAtUtc)
            throw new UnauthorizedException("نشست شما منقضی شده است. لطفاً دوباره وارد شوید.");

        if (!stored.User.IsActive || stored.User.IsDeleted)
            throw new ForbiddenException("این حساب غیرفعال شده است.");

        var result = await _sessions.CreateAsync(stored.User, cancellationToken);

        // چرخش توکن: توکن قبلی باطل و به توکن جدید زنجیر می‌شود
        stored.RevokedAtUtc = DateTime.UtcNow;
        stored.ReplacedByTokenHash = _tokens.HashToken(result.RefreshToken);
        await _context.SaveChangesAsync(cancellationToken);

        return result;
    }

    private async Task RevokeAllSessionsAsync(Guid userId, CancellationToken cancellationToken)
    {
        await RevokeAllSessions.ExecuteAsync(_context, userId, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
