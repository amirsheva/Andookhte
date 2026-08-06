using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Common;
using Andookhte.Domain.Entities.Debts;
using Andookhte.Domain.Entities.Finance;
using Andookhte.Domain.Entities.Identity;
using Andookhte.Domain.Entities.Workspaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Andookhte.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    private readonly IWorkspaceContext _workspace;

    public AppDbContext(DbContextOptions<AppDbContext> options, IWorkspaceContext workspace) : base(options)
    {
        _workspace = workspace;
    }

    /// <summary>
    /// فضای کاری فعال. اگر درخواست بدون احراز هویت باشد Guid.Empty می‌ماند و
    /// فیلتر سراسری هیچ ردیفی برنمی‌گرداند — یعنی حالت پیش‌فرض «هیچ داده‌ای» است، نه «همهٔ داده‌ها».
    /// </summary>
    private Guid CurrentWorkspaceId => _workspace.WorkspaceId ?? Guid.Empty;

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();

    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();

    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<DebtInstallment> DebtInstallments => Set<DebtInstallment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        /* ————————— هویت ————————— */

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(u => u.Email).HasMaxLength(256);
            entity.Property(u => u.PhoneNumber).HasMaxLength(20);
            entity.Property(u => u.DisplayName).HasMaxLength(128).IsRequired();
            entity.Property(u => u.PasswordHash).HasMaxLength(512);

            // یکتایی فیلتردار: چند کاربر می‌توانند ایمیل خالی داشته باشند (ورود فقط با پیامک).
            // گیومهٔ دوتایی، قالب استاندارد شناسه در PostgreSQL است.
            entity.HasIndex(u => u.Email).IsUnique().HasFilter("\"Email\" IS NOT NULL");
            entity.HasIndex(u => u.PhoneNumber).IsUnique().HasFilter("\"PhoneNumber\" IS NOT NULL");

            entity.HasQueryFilter(u => !u.IsDeleted);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.Property(t => t.TokenHash).HasMaxLength(128).IsRequired();
            entity.Property(t => t.ReplacedByTokenHash).HasMaxLength(128);
            entity.Property(t => t.CreatedByIp).HasMaxLength(64);
            entity.Property(t => t.UserAgent).HasMaxLength(512);

            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.HasIndex(t => new { t.UserId, t.RevokedAtUtc });

            entity.HasOne(t => t.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // فیلتر باید با فیلتر User هم‌خوان باشد. بدون این، توکنِ کاربرِ حذف‌شده پیدا می‌شود
            // ولی Include نویگیشن را null برمی‌گرداند و خواندن t.User.IsActive استثنا می‌دهد.
            entity.HasQueryFilter(t => !t.IsDeleted && !t.User.IsDeleted);

            entity.Ignore(t => t.IsActive);
        });

        modelBuilder.Entity<ApiKey>(entity =>
        {
            entity.Property(k => k.Label).HasMaxLength(64).IsRequired();
            entity.Property(k => k.KeyHash).HasMaxLength(128).IsRequired();
            entity.Property(k => k.LastFour).HasMaxLength(8).IsRequired();

            entity.HasIndex(k => k.KeyHash).IsUnique();
            entity.HasIndex(k => new { k.UserId, k.RevokedAtUtc });

            entity.HasOne(k => k.User)
                  .WithMany()
                  .HasForeignKey(k => k.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Workspace>()
                  .WithMany()
                  .HasForeignKey(k => k.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            // مثل RefreshToken، فیلتر بر اساس فضای کاری نیست — چون هندلر احراز هویت
            // باید بتواند بدون دانستنِ فضای کاری فعال (که خودش هنوز تعیین نشده)، کلید را پیدا کند.
            entity.HasQueryFilter(k => !k.IsDeleted && !k.User.IsDeleted);
        });

        modelBuilder.Entity<OtpCode>(entity =>
        {
            entity.Property(o => o.Receiver).HasMaxLength(256).IsRequired();
            entity.Property(o => o.CodeHash).HasMaxLength(128).IsRequired();

            entity.HasIndex(o => new { o.Receiver, o.Purpose, o.CreatedAtUtc });

            entity.HasQueryFilter(o => !o.IsDeleted);
            entity.Ignore(o => o.IsUsable);
        });

        /* ————————— فضای کاری ————————— */

        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.Property(w => w.Name).HasMaxLength(128).IsRequired();
            entity.Property(w => w.CurrencyCode).HasMaxLength(8).IsRequired();

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(w => w.OwnerUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(w => !w.IsDeleted);
        });

        modelBuilder.Entity<WorkspaceMember>(entity =>
        {
            entity.HasIndex(m => new { m.WorkspaceId, m.UserId }).IsUnique();

            entity.HasOne(m => m.Workspace)
                  .WithMany(w => w.Members)
                  .HasForeignKey(m => m.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.User)
                  .WithMany(u => u.Memberships)
                  .HasForeignKey(m => m.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // فیلتر عضویت فقط بر اساس حذف نرم است، نه فضای کاری؛
            // چون کاربر باید بتواند فهرست همهٔ فضاهای کاری خودش را ببیند.
            entity.HasQueryFilter(m => !m.IsDeleted);
        });

        /* ————————— مالی ————————— */

        modelBuilder.Entity<Account>(entity =>
        {
            entity.Property(a => a.Title).HasMaxLength(128).IsRequired();
            entity.Property(a => a.CurrencyCode).HasMaxLength(8).IsRequired();
            entity.Property(a => a.CardNumber).HasMaxLength(32);
            entity.Property(a => a.IBAN).HasMaxLength(34);
            entity.Property(a => a.BankName).HasMaxLength(128);
            entity.Property(a => a.InitialBalance).HasPrecision(18, 2);
            entity.Property(a => a.CurrentBalance).HasPrecision(18, 2);
            entity.Property(a => a.Note).HasMaxLength(512);
            entity.Property(a => a.GoldWeightGrams).HasPrecision(10, 3);
            entity.Property(a => a.GoldItemType).HasMaxLength(64);
            entity.Property(a => a.CryptoSymbol).HasMaxLength(16);
            entity.Property(a => a.ManualRateIrr).HasPrecision(18, 4);

            entity.HasIndex(a => a.WorkspaceId);

            entity.HasOne<Workspace>()
                  .WithMany()
                  .HasForeignKey(a => a.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(a => !a.IsDeleted && a.WorkspaceId == CurrentWorkspaceId);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.Property(t => t.Amount).HasPrecision(18, 2);
            entity.Property(t => t.Category).HasMaxLength(64);
            entity.Property(t => t.Description).HasMaxLength(512);

            entity.HasIndex(t => new { t.WorkspaceId, t.OccurredAtUtc });

            entity.HasOne<Workspace>()
                  .WithMany()
                  .HasForeignKey(t => t.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            // مجموعهٔ Account.Transactions باید صریحاً به یکی از دو رابطه وصل شود؛
            // در غیر این صورت EF یک رابطهٔ سوم با کلید خارجی سایه (AccountId) می‌سازد.
            entity.HasOne(t => t.SourceAccount)
                  .WithMany(a => a.Transactions)
                  .HasForeignKey(t => t.SourceAccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.DestinationAccount)
                  .WithMany()
                  .HasForeignKey(t => t.DestinationAccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(t => !t.IsDeleted && t.WorkspaceId == CurrentWorkspaceId);
        });

        /* ————————— بدهی و طلب ————————— */

        modelBuilder.Entity<Debt>(entity =>
        {
            entity.Property(d => d.Title).HasMaxLength(128).IsRequired();
            entity.Property(d => d.CounterpartyName).HasMaxLength(128);
            entity.Property(d => d.Note).HasMaxLength(512);

            entity.HasIndex(d => d.WorkspaceId);

            entity.HasOne<Workspace>()
                  .WithMany()
                  .HasForeignKey(d => d.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasQueryFilter(d => !d.IsDeleted && d.WorkspaceId == CurrentWorkspaceId);
        });

        modelBuilder.Entity<DebtInstallment>(entity =>
        {
            entity.Property(i => i.Amount).HasPrecision(18, 2);

            entity.HasIndex(i => new { i.DebtId, i.SequenceNumber });
            entity.HasIndex(i => new { i.WorkspaceId, i.DueDateUtc });

            entity.HasOne(i => i.Debt)
                  .WithMany(d => d.Installments)
                  .HasForeignKey(i => i.DebtId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Workspace>()
                  .WithMany()
                  .HasForeignKey(i => i.WorkspaceId)
                  .OnDelete(DeleteBehavior.Cascade);

            // حذف تراکنشِ مرتبط نباید قسط را یتیم بگذارد؛ هندلر حذف تراکنش این حالت
            // را صریحاً رد می‌کند (مثل محافظت حساب دارای تراکنش)، این Restrict خط دفاعی دوم است.
            entity.HasOne(i => i.PaidTransaction)
                  .WithMany()
                  .HasForeignKey(i => i.PaidTransactionId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasQueryFilter(i => !i.IsDeleted && i.WorkspaceId == CurrentWorkspaceId);
        });

        ApplyUtcDateTimeConversion(modelBuilder);
    }

    /// <summary>
    /// Npgsql ستون‌های <c>DateTime</c> را به <c>timestamptz</c> نگاشت می‌کند و هنگام نوشتن،
    /// مقداری با <c>Kind</c> غیر از <c>Utc</c> را رد می‌کند. تاریخ‌هایی که از JSON کلاینت
    /// می‌آیند معمولاً <c>Unspecified</c> هستند و بدون این تبدیل، ثبت تراکنش با
    /// «Cannot write DateTime with Kind=Unspecified» شکست می‌خورد.
    ///
    /// چون نام همهٔ فیلدها به Utc ختم می‌شود، قرارداد API روی UTC است؛ پس مقدار
    /// <c>Unspecified</c> به‌عنوان UTC تعبیر می‌شود، نه زمان محلی سرور.
    /// </summary>
    private static void ApplyUtcDateTimeConversion(ModelBuilder modelBuilder)
    {
        var toUtc = new ValueConverter<DateTime, DateTime>(
            value => NormalizeToUtc(value),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

        var toUtcNullable = new ValueConverter<DateTime?, DateTime?>(
            value => value == null ? null : NormalizeToUtc(value.Value),
            value => value == null ? null : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                    property.SetValueConverter(toUtc);
                else if (property.ClrType == typeof(DateTime?))
                    property.SetValueConverter(toUtcNullable);
            }
        }
    }

    private static DateTime NormalizeToUtc(DateTime value)
    {
        switch (value.Kind)
        {
            case DateTimeKind.Utc:
                return value;
            case DateTimeKind.Local:
                return value.ToUniversalTime();
            default:
                return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampAuditFields();
        return await base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        StampAuditFields();
        return base.SaveChanges();
    }

    /// <summary>تاریخ ویرایش و شمارندهٔ نسخه به‌صورت متمرکز پر می‌شوند تا در هندلرها تکرار نشود.</summary>
    private void StampAuditFields()
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAtUtc = entry.Entity.CreatedAtUtc == default
                        ? DateTime.UtcNow
                        : entry.Entity.CreatedAtUtc;
                    entry.Entity.RowVersion = 1;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAtUtc = DateTime.UtcNow;
                    entry.Entity.RowVersion++;
                    break;
            }
        }
    }
}
