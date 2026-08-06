using Andookhte.Application.Features.ApiKeys;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Andookhte.Api.Controllers;

/// <summary>
/// کلیدهای دسترسی شخصی — برای اتوماسیون‌هایی مثل شورتکات آیفون. هر کلید به فضای
/// کاری‌ای که هنگام ساخت فعال بوده محدود می‌شود (هدر X-Workspace-Id).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApiKeysController : ControllerBase
{
    private readonly IMediator _mediator;

    public ApiKeysController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<List<ApiKeyDto>>> List(CancellationToken ct)
        => Ok(await _mediator.Send(new GetApiKeysQuery(), ct));

    [HttpPost]
    public async Task<ActionResult<CreateApiKeyResult>> Create([FromBody] CreateApiKeyBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateApiKeyCommand(body.Label), ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new RevokeApiKeyCommand(id), ct);
        return NoContent();
    }
}

public record CreateApiKeyBody(string Label);
