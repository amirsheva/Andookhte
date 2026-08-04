using Andookhte.Domain.Entities.Finance;

namespace Andookhte.Application.Features.Transactions;

/// <summary>
/// اثر مالی یک تراکنش روی موجودی حساب‌ها.
///
/// این منطق عمداً فقط در یک نقطه نوشته شده. ثبت، ویرایش و حذف هر سه از همین‌جا
/// استفاده می‌کنند: ثبت یک بار Apply، حذف یک بار Revert، و ویرایش ابتدا Revert
/// با مقادیر قدیمی و سپس Apply با مقادیر جدید. اگر هرکدام نسخهٔ خودش را داشت،
/// دیر یا زود از هم واگرا می‌شدند — دقیقاً همان اتفاقی که در نسخهٔ قبلی افتاد و
/// موجودی دو بار کسر می‌شد.
/// </summary>
internal static class BalanceEffect
{
    /// <summary>اعمال اثر تراکنش روی موجودی.</summary>
    public static void Apply(TransactionType type, decimal amount, Account? source, Account? destination)
        => Mutate(type, amount, source, destination, +1);

    /// <summary>برگرداندن اثر تراکنش — دقیقاً وارونهٔ Apply.</summary>
    public static void Revert(TransactionType type, decimal amount, Account? source, Account? destination)
        => Mutate(type, amount, source, destination, -1);

    private static void Mutate(
        TransactionType type,
        decimal amount,
        Account? source,
        Account? destination,
        int direction)
    {
        var delta = amount * direction;

        switch (type)
        {
            case TransactionType.Expense:
                if (source is not null) source.CurrentBalance -= delta;
                break;

            case TransactionType.Income:
                if (destination is not null) destination.CurrentBalance += delta;
                break;

            case TransactionType.Transfer:
                if (source is not null) source.CurrentBalance -= delta;
                if (destination is not null) destination.CurrentBalance += delta;
                break;
        }
    }
}
