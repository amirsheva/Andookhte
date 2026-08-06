using Andookhte.Application.Features.Transactions;
using Andookhte.Domain.Entities.Finance;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Andookhte.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TransactionsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<ActionResult<PagedResult<TransactionDto>>> Get(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        CancellationToken ct = default)
        => Ok(await _mediator.Send(new GetTransactionsQuery(from, to, page, pageSize), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTransactionCommand command, CancellationToken ct)
    {
        var id = await _mediator.Send(command, ct);
        return Ok(new { id, message = "تراکنش با موفقیت ثبت شد." });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTransactionBody body, CancellationToken ct)
    {
        await _mediator.Send(
            new UpdateTransactionCommand(id, body.Type, body.Amount, body.SourceAccountId,
                body.DestinationAccountId, body.Category, body.Description, body.OccurredAtUtc), ct);

        return NoContent();
    }

    /// <summary>حذف نرم تراکنش به همراه برگرداندن اثر آن روی موجودی حساب‌ها.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteTransactionCommand(id), ct);
        return NoContent();
    }

    /// <summary>حذف دسته‌جمعی — هر ردیف جدا موفق/ناموفق گزارش می‌شود، نه همه‌یا‌هیچ.</summary>
    [HttpPost("bulk-delete")]
    public async Task<ActionResult<BulkDeleteResult>> BulkDelete(
        [FromBody] BulkDeleteBody body, CancellationToken ct)
        => Ok(await _mediator.Send(new BulkDeleteTransactionsCommand(body.Ids), ct));

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        var bytes = await _mediator.Send(new ExportTransactionsQuery(from, to), ct);
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"andookhte-transactions-{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    /// <summary>
    /// ورود دسته‌جمعی از همان قالب فایلی که «خروجی اکسل» می‌سازد. هر ردیف جدا
    /// اعتبارسنجی می‌شود — یک ردیف خراب بقیهٔ فایل را متوقف نمی‌کند.
    /// </summary>
    [HttpPost("import")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ImportTransactionsResult>> Import(IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0)
            return BadRequest(new { message = "فایلی انتخاب نشده است." });

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);

        return Ok(await _mediator.Send(new ImportTransactionsCommand(stream.ToArray()), ct));
    }
}

public record BulkDeleteBody(List<Guid> Ids);

public record UpdateTransactionBody(
    TransactionType Type,
    decimal Amount,
    Guid? SourceAccountId = null,
    Guid? DestinationAccountId = null,
    string? Category = null,
    string? Description = null,
    DateTime? OccurredAtUtc = null
);
