using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Finance;
using ClosedXML.Excel;

namespace Andookhte.Infrastructure.Excel;

/// <summary>
/// ستون‌های خروجی و ورودی عمداً یکسان‌اند تا فایلی که از «خروجی اکسل» گرفته می‌شود،
/// بعد از ویرایش دستی، مستقیم قابل «ورودی» باشد.
/// </summary>
public class ClosedXmlTransactionWorkbookService : ITransactionWorkbookService
{
    private static readonly string[] Headers =
    [
        "تاریخ (میلادی)", "نوع", "مبلغ", "حساب مبدأ", "حساب مقصد", "دسته‌بندی", "توضیحات"
    ];

    public byte[] Export(IReadOnlyList<TransactionExportRow> rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("تراکنش‌ها");
        sheet.RightToLeft = true;

        for (var col = 0; col < Headers.Length; col++)
        {
            var cell = sheet.Cell(1, col + 1);
            cell.Value = Headers[col];
            cell.Style.Font.Bold = true;
        }

        var row = 2;
        foreach (var item in rows)
        {
            sheet.Cell(row, 1).Value = item.OccurredAtUtc;
            sheet.Cell(row, 1).Style.DateFormat.Format = "yyyy-mm-dd hh:mm";
            sheet.Cell(row, 2).Value = TypeLabel(item.Type);
            sheet.Cell(row, 3).Value = item.Amount;
            sheet.Cell(row, 4).Value = item.SourceAccountTitle ?? string.Empty;
            sheet.Cell(row, 5).Value = item.DestinationAccountTitle ?? string.Empty;
            sheet.Cell(row, 6).Value = item.Category ?? string.Empty;
            sheet.Cell(row, 7).Value = item.Description ?? string.Empty;
            row++;
        }

        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public IReadOnlyList<TransactionImportRow> Parse(Stream fileStream)
    {
        using var workbook = new XLWorkbook(fileStream);
        var sheet = workbook.Worksheets.First();

        var results = new List<TransactionImportRow>();
        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;

        // ردیف ۱ همیشه سرستون فرض می‌شود؛ اگر کاربر آن را پاک کرده باشد، همان ردیف
        // به‌عنوان دادهٔ نامعتبر گزارش می‌شود، نه اینکه بی‌صدا نادیده گرفته شود.
        for (var row = 2; row <= lastRow; row++)
        {
            var dateCell = sheet.Cell(row, 1);
            var isEmpty = sheet.Row(row).CellsUsed().All(c => string.IsNullOrWhiteSpace(c.GetString()));
            if (isEmpty) continue;

            DateTime? occurredAt = dateCell.TryGetValue(out DateTime parsedDate)
                ? DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc)
                : null;

            var amountCell = sheet.Cell(row, 3);
            decimal? amount = amountCell.TryGetValue(out double parsedAmount) ? (decimal)parsedAmount : null;

            results.Add(new TransactionImportRow(
                RowNumber: row,
                OccurredAtUtc: occurredAt,
                TypeRaw: Blank(sheet.Cell(row, 2).GetString()),
                Amount: amount,
                SourceAccountTitle: Blank(sheet.Cell(row, 4).GetString()),
                DestinationAccountTitle: Blank(sheet.Cell(row, 5).GetString()),
                Category: Blank(sheet.Cell(row, 6).GetString()),
                Description: Blank(sheet.Cell(row, 7).GetString())
            ));
        }

        return results;
    }

    private static string TypeLabel(TransactionType type) => type switch
    {
        TransactionType.Income => "درآمد",
        TransactionType.Expense => "هزینه",
        TransactionType.Transfer => "انتقال",
        _ => type.ToString()
    };

    private static string? Blank(string value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
