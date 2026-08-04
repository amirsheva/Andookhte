using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Application.Common.Security;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Workspaces;

/* ————————————————— فهرست اعضا ————————————————— */

public record GetWorkspaceMembersQuery : IRequest<List<WorkspaceMemberDto>>;

public class GetWorkspaceMembersQueryHandler : IRequestHandler<GetWorkspaceMembersQuery, List<WorkspaceMemberDto>>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public GetWorkspaceMembersQueryHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<List<WorkspaceMemberDto>> Handle(GetWorkspaceMembersQuery request, CancellationToken cancellationToken)
    {
        var workspaceId = _workspace.RequireWorkspaceId();

        return await _context.WorkspaceMembers
            .Where(m => m.WorkspaceId == workspaceId && !m.IsDeleted)
            .OrderByDescending(m => m.Role)
            .ThenBy(m => m.JoinedAtUtc)
            .Select(m => new WorkspaceMemberDto(
                m.Id,
                m.UserId,
                m.User.DisplayName,
                m.User.Email,
                m.User.PhoneNumber,
                m.Role,
                m.Workspace.OwnerUserId == m.UserId,
                m.JoinedAtUtc))
            .ToListAsync(cancellationToken);
    }
}

/* ————————————————— افزودن عضو ————————————————— */

/// <summary>
/// افزودن کاربر موجود به فضای کاری با ایمیل یا شمارهٔ موبایل.
/// نقش افزوده‌شده هرگز نمی‌تواند از نقش خودِ دعوت‌کننده بالاتر باشد.
/// </summary>
public record AddWorkspaceMemberCommand(string Identifier, WorkspaceRole Role)
    : IRequest<WorkspaceMemberDto>;

public class AddWorkspaceMemberCommandHandler : IRequestHandler<AddWorkspaceMemberCommand, WorkspaceMemberDto>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public AddWorkspaceMemberCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<WorkspaceMemberDto> Handle(AddWorkspaceMemberCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Admin);
        var workspaceId = _workspace.RequireWorkspaceId();

        if (request.Role == WorkspaceRole.Owner)
            throw new ValidationException("نقش مالک قابل واگذاری از این مسیر نیست.");

        if (request.Role > _workspace.Role)
            throw new ForbiddenException("نمی‌توانید نقشی بالاتر از نقش خودتان بدهید.");

        var email = Normalizer.Email(request.Identifier);
        var phone = Normalizer.Phone(request.Identifier);

        var user = await _context.Users.FirstOrDefaultAsync(
            u => !u.IsDeleted && ((email != null && u.Email == email) || (phone != null && u.PhoneNumber == phone)),
            cancellationToken)
            ?? throw new NotFoundException("کاربری با این ایمیل یا شمارهٔ موبایل ثبت نشده است.");

        var existing = await _context.WorkspaceMembers
            .FirstOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == user.Id, cancellationToken);

        if (existing is not null && !existing.IsDeleted)
            throw new ConflictException("این کاربر از قبل عضو این فضای کاری است.");

        WorkspaceMember member;
        if (existing is not null)
        {
            // عضو قبلاً حذف نرم شده بود؛ همان رکورد دوباره فعال می‌شود
            existing.IsDeleted = false;
            existing.Role = request.Role;
            existing.JoinedAtUtc = DateTime.UtcNow;
            member = existing;
        }
        else
        {
            member = new WorkspaceMember
            {
                WorkspaceId = workspaceId,
                UserId = user.Id,
                Role = request.Role
            };
            _context.WorkspaceMembers.Add(member);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new WorkspaceMemberDto(
            member.Id, user.Id, user.DisplayName, user.Email, user.PhoneNumber,
            member.Role, false, member.JoinedAtUtc);
    }
}

/* ————————————————— تغییر نقش ————————————————— */

public record UpdateMemberRoleCommand(Guid MemberId, WorkspaceRole Role) : IRequest<Unit>;

public class UpdateMemberRoleCommandHandler : IRequestHandler<UpdateMemberRoleCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;

    public UpdateMemberRoleCommandHandler(IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(UpdateMemberRoleCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Admin);
        var workspaceId = _workspace.RequireWorkspaceId();
        var userId = _currentUser.RequireUserId();

        if (request.Role == WorkspaceRole.Owner)
            throw new ValidationException("نقش مالک از این مسیر قابل تنظیم نیست.");

        if (request.Role > _workspace.Role)
            throw new ForbiddenException("نمی‌توانید نقشی بالاتر از نقش خودتان بدهید.");

        var member = await _context.WorkspaceMembers
            .Include(m => m.Workspace)
            .FirstOrDefaultAsync(m => m.Id == request.MemberId && m.WorkspaceId == workspaceId && !m.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("عضو یافت نشد.");

        if (member.Workspace.OwnerUserId == member.UserId)
            throw new ForbiddenException("نقش مالک فضای کاری قابل تغییر نیست.");

        if (member.UserId == userId)
            throw new ValidationException("نقش خودتان را نمی‌توانید تغییر دهید.");

        member.Role = request.Role;
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

/* ————————————————— حذف عضو ————————————————— */

public record RemoveMemberCommand(Guid MemberId) : IRequest<Unit>;

public class RemoveMemberCommandHandler : IRequestHandler<RemoveMemberCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;

    public RemoveMemberCommandHandler(IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(RemoveMemberCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Admin);
        var workspaceId = _workspace.RequireWorkspaceId();
        var userId = _currentUser.RequireUserId();

        var member = await _context.WorkspaceMembers
            .Include(m => m.Workspace)
            .FirstOrDefaultAsync(m => m.Id == request.MemberId && m.WorkspaceId == workspaceId && !m.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("عضو یافت نشد.");

        if (member.Workspace.OwnerUserId == member.UserId)
            throw new ForbiddenException("مالک فضای کاری قابل حذف نیست.");

        if (member.UserId == userId)
            throw new ValidationException("خودتان را نمی‌توانید حذف کنید.");

        if (member.Role > _workspace.Role)
            throw new ForbiddenException("نمی‌توانید عضوی با نقش بالاتر از خودتان را حذف کنید.");

        member.IsDeleted = true;
        member.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
