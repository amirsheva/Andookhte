using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.ApiKeys;

/* ————————————————— فهرست ————————————————— */

public record GetApiKeysQuery : IRequest<List<ApiKeyDto>>;

public class GetApiKeysQueryHandler : IRequestHandler<GetApiKeysQuery, List<ApiKeyDto>>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;

    public GetApiKeysQueryHandler(IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
    }

    public async Task<List<ApiKeyDto>> Handle(GetApiKeysQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();
        var workspaceId = _workspace.RequireWorkspaceId();

        return await _context.ApiKeys
            .Where(k => k.UserId == userId && k.WorkspaceId == workspaceId)
            .OrderByDescending(k => k.CreatedAtUtc)
            .Select(k => new ApiKeyDto(
                k.Id, k.Label, k.LastFour, k.CreatedAtUtc, k.LastUsedAtUtc, k.RevokedAtUtc != null))
            .ToListAsync(cancellationToken);
    }
}

/* ————————————————— ساخت ————————————————— */

public record CreateApiKeyCommand(string Label) : IRequest<CreateApiKeyResult>;

public class CreateApiKeyCommandHandler : IRequestHandler<CreateApiKeyCommand, CreateApiKeyResult>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;
    private readonly ITokenService _tokens;

    public CreateApiKeyCommandHandler(
        IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser, ITokenService tokens)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
        _tokens = tokens;
    }

    public async Task<CreateApiKeyResult> Handle(CreateApiKeyCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();
        var workspaceId = _workspace.RequireWorkspaceId();

        var label = request.Label?.Trim();
        if (string.IsNullOrWhiteSpace(label))
            throw new ValidationException("یک نام برای کلید وارد کنید — مثلاً «شورتکات آیفون».");

        var raw = $"{Prefix}{_tokens.GenerateRefreshToken()}";

        var apiKey = new ApiKey
        {
            UserId = userId,
            WorkspaceId = workspaceId,
            Label = label,
            KeyHash = _tokens.HashToken(raw),
            LastFour = raw[^4..]
        };

        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync(cancellationToken);

        return new CreateApiKeyResult(apiKey.Id, apiKey.Label, raw, apiKey.CreatedAtUtc);
    }

    /// <summary>
    /// پیشوند ثابت — هم برای تشخیصِ سریع نوع کلید در نگاه اول، هم برای اینکه لایهٔ
    /// احراز هویت بتواند بدون کوئری دیتابیس، توکن JWT را از کلید API تشخیص دهد.
    /// </summary>
    public const string Prefix = "andk_";
}

/* ————————————————— باطل کردن ————————————————— */

public record RevokeApiKeyCommand(Guid Id) : IRequest<Unit>;

public class RevokeApiKeyCommandHandler : IRequestHandler<RevokeApiKeyCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUser _currentUser;

    public RevokeApiKeyCommandHandler(IAppDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(RevokeApiKeyCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.RequireUserId();

        var apiKey = await _context.ApiKeys
            .FirstOrDefaultAsync(k => k.Id == request.Id && k.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("کلید یافت نشد.");

        if (apiKey.RevokedAtUtc is null)
        {
            apiKey.RevokedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Unit.Value;
    }
}
