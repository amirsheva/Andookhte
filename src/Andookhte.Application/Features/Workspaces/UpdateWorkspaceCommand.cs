using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Workspaces;

public record UpdateWorkspaceCommand(string Name) : IRequest<Unit>;

public class UpdateWorkspaceCommandHandler : IRequestHandler<UpdateWorkspaceCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public UpdateWorkspaceCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(UpdateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Admin);
        var workspaceId = _workspace.RequireWorkspaceId();

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("نام فضای کاری را وارد کنید.");

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId && !w.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("فضای کاری یافت نشد.");

        workspace.Name = name;
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
