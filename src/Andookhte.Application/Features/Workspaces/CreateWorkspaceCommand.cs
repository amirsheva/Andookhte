using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Workspaces;

public record CreateWorkspaceCommand(
    string Name,
    WorkspaceType Type = WorkspaceType.Business,
    string CurrencyCode = "IRR"
) : IRequest<WorkspaceDto>;

public class CreateWorkspaceCommandHandler : IRequestHandler<CreateWorkspaceCommand, WorkspaceDto>
{
    private const int MaxWorkspacesPerUser = 10;

    private readonly IAppDbContext _context;
    private readonly ICurrentUser _currentUser;

    public CreateWorkspaceCommandHandler(IAppDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<WorkspaceDto> Handle(CreateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("نام فضای کاری را وارد کنید.");

        var ownedCount = await _context.Workspaces
            .CountAsync(w => w.OwnerUserId == userId && !w.IsDeleted, cancellationToken);

        if (ownedCount >= MaxWorkspacesPerUser)
            throw new ValidationException($"حداکثر {MaxWorkspacesPerUser} فضای کاری می‌توانید بسازید.");

        var duplicate = await _context.Workspaces
            .AnyAsync(w => w.OwnerUserId == userId && w.Name == name && !w.IsDeleted, cancellationToken);

        if (duplicate)
            throw new ConflictException("فضای کاری با همین نام دارید.");

        var workspace = new Workspace
        {
            Name = name,
            Type = request.Type,
            OwnerUserId = userId,
            CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode) ? "IRR" : request.CurrencyCode.Trim().ToUpperInvariant()
        };

        _context.Workspaces.Add(workspace);
        _context.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = userId,
            Role = WorkspaceRole.Owner
        });

        await _context.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(
            workspace.Id,
            workspace.Name,
            workspace.Type,
            workspace.CurrencyCode,
            WorkspaceRole.Owner,
            true,
            1
        );
    }
}
