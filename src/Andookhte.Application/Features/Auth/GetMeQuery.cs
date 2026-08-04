using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Auth;

public record MeDto(
    UserDto User,
    IReadOnlyList<WorkspaceSummaryDto> Workspaces,
    Guid? ActiveWorkspaceId,
    WorkspaceRole? ActiveRole
);

public record GetMeQuery : IRequest<MeDto>;

public class GetMeQueryHandler : IRequestHandler<GetMeQuery, MeDto>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceContext _workspace;

    public GetMeQueryHandler(IAppDbContext context, ICurrentUser currentUser, IWorkspaceContext workspace)
    {
        _context = context;
        _currentUser = currentUser;
        _workspace = workspace;
    }

    public async Task<MeDto> Handle(GetMeQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("کاربر یافت نشد.");

        var workspaces = await _context.WorkspaceMembers
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

        return new MeDto(
            AuthSessionFactory.ToDto(user),
            workspaces,
            _workspace.WorkspaceId,
            _workspace.Role
        );
    }
}
