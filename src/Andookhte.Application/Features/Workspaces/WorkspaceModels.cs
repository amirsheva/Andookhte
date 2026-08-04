using Andookhte.Domain.Entities.Workspaces;

namespace Andookhte.Application.Features.Workspaces;

public record WorkspaceDto(
    Guid Id,
    string Name,
    WorkspaceType Type,
    string CurrencyCode,
    WorkspaceRole MyRole,
    bool IsOwner,
    int MemberCount
);

public record WorkspaceMemberDto(
    Guid Id,
    Guid UserId,
    string DisplayName,
    string? Email,
    string? PhoneNumber,
    WorkspaceRole Role,
    bool IsOwner,
    DateTime JoinedAtUtc
);
