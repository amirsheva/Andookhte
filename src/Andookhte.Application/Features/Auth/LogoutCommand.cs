using Andookhte.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

/// <summary>
/// خروج. اگر <c>AllDevices</c> درست باشد همهٔ نشست‌های کاربر باطل می‌شوند.
/// این عملیات هرگز خطا نمی‌دهد تا خروج از سمت کاربر همیشه موفق باشد.
/// </summary>
public record LogoutCommand(string? RefreshToken, bool AllDevices = false) : IRequest<Unit>;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ITokenService _tokens;
    private readonly ICurrentUser _currentUser;

    public LogoutCommandHandler(IAppDbContext context, ITokenService tokens, ICurrentUser currentUser)
    {
        _context = context;
        _tokens = tokens;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        if (request.AllDevices && _currentUser.UserId is { } userId)
        {
            var sessions = await _context.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
                .ToListAsync(cancellationToken);

            foreach (var session in sessions)
                session.RevokedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }

        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Unit.Value;

        var hash = _tokens.HashToken(request.RefreshToken);
        var stored = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.RevokedAtUtc == null, cancellationToken);

        if (stored is not null)
        {
            stored.RevokedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Unit.Value;
    }
}
