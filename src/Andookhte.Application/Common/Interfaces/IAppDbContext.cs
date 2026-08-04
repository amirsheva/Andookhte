using Andookhte.Domain.Entities.Finance;
using Andookhte.Domain.Entities.Identity;
using Andookhte.Domain.Entities.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<OtpCode> OtpCodes { get; }

    DbSet<Workspace> Workspaces { get; }
    DbSet<WorkspaceMember> WorkspaceMembers { get; }

    DbSet<Account> Accounts { get; }
    DbSet<Transaction> Transactions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
