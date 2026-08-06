using Andookhte.Domain.Entities.Finance;

namespace Andookhte.Application.Common.Interfaces;

/// <summary>یک ردیف آماده برای نوشتن در اکسل — حساب‌ها با عنوان نمایش داده می‌شوند، نه شناسه.</summary>
public record TransactionExportRow(
    DateTime OccurredAtUtc,
    TransactionType Type,
    decimal Amount,
    string? SourceAccountTitle,
    string? DestinationAccountTitle,
    string? Category,
    string? Description
);

/// <summary>
/// یک ردیف خام خوانده‌شده از اکسل. اعتبارسنجی و تبدیل عنوان حساب به شناسه در لایهٔ
/// Application انجام می‌شود، نه اینجا — این سرویس فقط قالب فایل را می‌فهمد.
/// </summary>
public record TransactionImportRow(
    int RowNumber,
    DateTime? OccurredAtUtc,
    string? TypeRaw,
    decimal? Amount,
    string? SourceAccountTitle,
    string? DestinationAccountTitle,
    string? Category,
    string? Description
);

public interface ITransactionWorkbookService
{
    byte[] Export(IReadOnlyList<TransactionExportRow> rows);

    IReadOnlyList<TransactionImportRow> Parse(Stream fileStream);
}
