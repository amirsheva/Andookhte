using Andookhte.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Workspaces;

public record GetMyWorkspacesQuery : IRequest<List<WorkspaceDto>>;

public class GetMyWorkspacesQueryHandler : IRequestHandler<GetMyWorkspacesQuery, List<WorkspaceDto>>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUser _currentUser;

    public GetMyWorkspacesQueryHandler(IAppDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<List<WorkspaceDto>> Handle(GetMyWorkspacesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        return await _context.WorkspaceMembers
            .Where(m => m.UserId == userId && !m.IsDeleted)
            .OrderByDescending(m => m.Role)
            .ThenBy(m => m.JoinedAtUtc)
            .Select(m => new WorkspaceDto(
                m.Workspace.Id,
                m.Workspace.Name,
                m.Workspace.Type,
                m.Workspace.CurrencyCode,
                m.Role,
                m.Workspace.OwnerUserId == userId,
                m.Workspace.Members.Count(x => !x.IsDeleted)))
            .ToListAsync(cancellationToken);
    }
}
