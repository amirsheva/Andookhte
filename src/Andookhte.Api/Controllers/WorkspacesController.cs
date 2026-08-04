using Andookhte.Application.Features.Workspaces;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Andookhte.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkspacesController : ControllerBase
{
    private readonly IMediator _mediator;

    public WorkspacesController(IMediator mediator) => _mediator = mediator;

    /// <summary>فضاهای کاری که کاربر جاری در آن‌ها عضو است.</summary>
    [HttpGet]
    public async Task<ActionResult<List<WorkspaceDto>>> GetMine(CancellationToken ct)
        => Ok(await _mediator.Send(new GetMyWorkspacesQuery(), ct));

    [HttpPost]
    public async Task<ActionResult<WorkspaceDto>> Create([FromBody] CreateWorkspaceCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>اعضای فضای کاری فعال (تعیین‌شده با هدر X-Workspace-Id).</summary>
    [HttpGet("members")]
    public async Task<ActionResult<List<WorkspaceMemberDto>>> GetMembers(CancellationToken ct)
        => Ok(await _mediator.Send(new GetWorkspaceMembersQuery(), ct));

    [HttpPost("members")]
    public async Task<ActionResult<WorkspaceMemberDto>> AddMember(
        [FromBody] AddWorkspaceMemberCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    [HttpPut("members/{memberId:guid}/role")]
    public async Task<IActionResult> UpdateRole(
        Guid memberId, [FromBody] UpdateMemberRoleBody body, CancellationToken ct)
    {
        await _mediator.Send(new UpdateMemberRoleCommand(memberId, body.Role), ct);
        return NoContent();
    }

    [HttpDelete("members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid memberId, CancellationToken ct)
    {
        await _mediator.Send(new RemoveMemberCommand(memberId), ct);
        return NoContent();
    }
}

public record UpdateMemberRoleBody(WorkspaceRole Role);
