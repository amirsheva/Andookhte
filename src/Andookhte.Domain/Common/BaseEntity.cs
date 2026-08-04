namespace Andookhte.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; } = false;

    // کلید ردیابی نسخه برای همگام‌سازی آفلاین به آنلاین
    public long RowVersion { get; set; }
}