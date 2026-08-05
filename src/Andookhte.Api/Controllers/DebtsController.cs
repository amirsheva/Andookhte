using Andookhte.Application.Features.Debts;
using Andookhte.Domain.Entities.Debts;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Andookhte.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DebtsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DebtsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<List<DebtDto>>> Get(CancellationToken ct)
        => Ok(await _mediator.Send(new GetDebtsQuery(), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDebtBody body, CancellationToken ct)
    {
        var id = await _mediator.Send(
            new CreateDebtCommand(
                body.Title, body.Direction, body.RecurrenceType, body.FirstDueDateUtc,
                body.Amount, body.OccurrenceCount, body.CounterpartyName, body.Note,
                body.AlreadyPaidCount),
            ct);

        return Ok(new { id, message = "بدهی/طلب با موفقیت ثبت شد." });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDebtBody body, CancellationToken ct)
    {
        await _mediator.Send(new UpdateDebtCommand(id, body.Title, body.CounterpartyName, body.Note), ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/reschedule")]
    public async Task<IActionResult> Reschedule(Guid id, [FromBody] RescheduleDebtBody body, CancellationToken ct)
    {
        await _mediator.Send(new RescheduleDebtCommand(id, body.NewFirstDueDateUtc), ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteDebtCommand(id), ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/extend")]
    public async Task<IActionResult> Extend(Guid id, [FromBody] ExtendDebtBody body, CancellationToken ct)
    {
        await _mediator.Send(new ExtendDebtCommand(id, body.AdditionalCount), ct);
        return NoContent();
    }

    [HttpPut("installments/{installmentId:guid}")]
    public async Task<IActionResult> UpdateInstallment(
        Guid installmentId, [FromBody] UpdateInstallmentBody body, CancellationToken ct)
    {
        await _mediator.Send(
            new UpdateInstallmentAmountCommand(installmentId, body.Amount, body.DueDateUtc), ct);
        return NoContent();
    }

    [HttpPost("installments/{installmentId:guid}/pay")]
    public async Task<IActionResult> PayInstallment(
        Guid installmentId, [FromBody] PayInstallmentBody body, CancellationToken ct)
    {
        await _mediator.Send(
            new RecordInstallmentPaymentCommand(installmentId, body.AccountId, body.PaidAtUtc), ct);
        return NoContent();
    }

    [HttpPost("installments/{installmentId:guid}/revert")]
    public async Task<IActionResult> RevertInstallment(Guid installmentId, CancellationToken ct)
    {
        await _mediator.Send(new RevertInstallmentPaymentCommand(installmentId), ct);
        return NoContent();
    }
}

/// <summary>شناسه از مسیر خوانده می‌شود، پس بدنه‌ها آن را ندارند.</summary>
public record CreateDebtBody(
    string Title,
    DebtDirection Direction,
    DebtRecurrenceType RecurrenceType,
    DateTime FirstDueDateUtc,
    decimal Amount,
    int OccurrenceCount = 1,
    string? CounterpartyName = null,
    string? Note = null,
    int AlreadyPaidCount = 0
);

public record UpdateDebtBody(string Title, string? CounterpartyName, string? Note);

public record RescheduleDebtBody(DateTime NewFirstDueDateUtc);

public record ExtendDebtBody(int AdditionalCount);

public record UpdateInstallmentBody(decimal Amount, DateTime? DueDateUtc);

public record PayInstallmentBody(Guid AccountId, DateTime? PaidAtUtc);
