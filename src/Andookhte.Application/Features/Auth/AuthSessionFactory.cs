using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;
using Andookhte.Domain.Entities.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

public interface IAuthSessionFactory
{
    /// <summary>
    /// یک نشست کامل می‌سازد: توکن دسترسی، توکن تمدید ذخیره‌شده و فهرست فضاهای کاری کاربر.
    /// اگر کاربر هیچ فضای کاری نداشته باشد، یک فضای شخصی برایش ساخته می‌شود.
    /// </summary>
    Task<AuthResultDto> CreateAsync(User user, CancellationToken cancellationToken = default);
}

public class AuthSessionFactory : IAuthSessionFactory
{
    private readonly IAppDbContext _context;
    private readonly ITokenService _tokens;
    private readonly ICurrentUser _currentUser;

    public AuthSessionFactory(IAppDbContext context, ITokenService tokens, ICurrentUser currentUser)
    {
        _context = context;
        _tokens = tokens;
        _currentUser = currentUser;
    }

    public async Task<AuthResultDto> CreateAsync(User user, CancellationToken cancellationToken = default)
    {
        var memberships = await LoadMembershipsAsync(user.Id, cancellationToken);

        // کاربر تازه‌وارد هنوز فضای کاری ندارد؛ یک فضای شخصی برایش می‌سازیم
        if (memberships.Count == 0)
        {
            CreatePersonalWorkspace(user);
            await _context.SaveChangesAsync(cancellationToken);
            memberships = await LoadMembershipsAsync(user.Id, cancellationToken);

            if (memberships.Count == 0)
                throw new InvalidOperationException("ساخت فضای کاری پیش‌فرض برای کاربر ناموفق بود.");
        }

        var accessToken = _tokens.CreateAccessToken(user);
        var refreshToken = _tokens.GenerateRefreshToken();

        _context.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _tokens.HashToken(refreshToken),
            ExpiresAtUtc = DateTime.UtcNow.Add(_tokens.RefreshTokenLifetime),
            CreatedByIp = _currentUser.IpAddress,
            UserAgent = _currentUser.UserAgent
        });

        user.LastLoginAtUtc = DateTime.UtcNow;
        user.FailedLoginAttempts = 0;
        user.LockoutEndsAtUtc = null;

        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResultDto(
            accessToken.Value,
            accessToken.ExpiresInSeconds,
            refreshToken,
            ToDto(user),
            memberships,
            memberships[0].Id
        );
    }

    private void CreatePersonalWorkspace(User user)
    {
        var workspace = new Workspace
        {
            Name = string.IsNullOrWhiteSpace(user.DisplayName) ? "فضای شخصی" : $"حساب شخصی {user.DisplayName}",
            Type = WorkspaceType.Personal,
            OwnerUserId = user.Id,
            CurrencyCode = "IRR"
        };

        _context.Workspaces.Add(workspace);
        _context.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = user.Id,
            Role = WorkspaceRole.Owner
        });
    }

    private async Task<List<WorkspaceSummaryDto>> LoadMembershipsAsync(Guid userId, CancellationToken cancellationToken)
        => await _context.WorkspaceMembers
            .Where(m => m.UserId == userId && !m.IsDeleted)
            .OrderByDescending(m => m.Role)
            .ThenBy(m => m.JoinedAtUtc)
            .Select(m => new WorkspaceSummaryDto(
                m.Workspace.Id,
                m.Workspace.Name,
                m.Workspace.Type,
                m.Workspace.CurrencyCode,
                m.Role,
                m.Workspace.OwnerUserId == userId))
            .ToListAsync(cancellationToken);

    public static UserDto ToDto(User user) => new(
        user.Id,
        user.DisplayName,
        user.Email,
        user.PhoneNumber,
        user.IsEmailConfirmed,
        user.IsPhoneConfirmed
    );
}
