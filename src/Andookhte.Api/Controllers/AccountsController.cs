using Andookhte.Application.Features.Accounts;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Andookhte.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AccountsController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// حساب‌های فضای کاری فعال. شناسهٔ کاربر در مسیر نمی‌آید —
    /// محدودسازی داده از روی توکن و هدر X-Workspace-Id انجام می‌شود.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<AccountDto>>> Get(CancellationToken ct)
        => Ok(await _mediator.Send(new GetAccountsQuery(), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountCommand command, CancellationToken ct)
    {
        var id = await _mediator.Send(command, ct);
        return Ok(new { id, message = "حساب با موفقیت ایجاد شد." });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAccountBody body, CancellationToken ct)
    {
        await _mediator.Send(
            new UpdateAccountCommand(id, body.Title, body.Type, body.CurrencyCode,
                body.CardNumber, body.IBAN, body.BankName), ct);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteAccountCommand(id), ct);
        return NoContent();
    }
}

/// <summary>
/// شناسه از مسیر خوانده می‌شود، پس بدنه آن را ندارد — این‌طور امکان ناهمخوانی
/// بین شناسهٔ مسیر و بدنه از بین می‌رود.
/// </summary>
public record UpdateAccountBody(
    string Title,
    Domain.Entities.Finance.AccountType Type,
    string CurrencyCode = "IRR",
    string? CardNumber = null,
    string? IBAN = null,
    string? BankName = null
);
