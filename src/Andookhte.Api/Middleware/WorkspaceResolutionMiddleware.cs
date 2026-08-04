using Andookhte.Api.Services;
using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Api.Middleware;

/// <summary>
/// فضای کاری فعال را از هدر <c>X-Workspace-Id</c> می‌خواند و در برابر عضویت کاربر اعتبارسنجی می‌کند.
/// اگر هدر نیامده باشد، نخستین فضای کاری کاربر (با بالاترین نقش) انتخاب می‌شود
/// تا کلاینت‌های ساده بدون مدیریت هدر هم کار کنند.
/// </summary>
public class WorkspaceResolutionMiddleware
{
    public const string HeaderName = "X-Workspace-Id";

    private readonly RequestDelegate _next;

    public WorkspaceResolutionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        ICurrentUser currentUser,
        WorkspaceContext workspaceContext,
        IAppDbContext database)
    {
        if (currentUser.UserId is { } userId)
        {
            var requested = ReadRequestedWorkspaceId(context);

            var membership = await database.WorkspaceMembers
                .Where(m => m.UserId == userId)
                .Where(m => requested == null || m.WorkspaceId == requested)
                .OrderByDescending(m => m.Role)
                .ThenBy(m => m.JoinedAtUtc)
                .Select(m => new { m.WorkspaceId, m.Role })
                .FirstOrDefaultAsync(context.RequestAborted);

            // هدر فرستاده شده ولی کاربر عضو آن فضای کاری نیست — درخواست همین‌جا رد می‌شود
            if (requested is not null && membership is null)
                throw new ForbiddenException("به این فضای کاری دسترسی ندارید.");

            if (membership is not null)
                workspaceContext.Set(membership.WorkspaceId, membership.Role);
        }

        await _next(context);
    }

    private static Guid? ReadRequestedWorkspaceId(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue(HeaderName, out var values))
            return null;

        var raw = values.ToString();
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (!Guid.TryParse(raw, out var id))
            throw new ValidationException($"مقدار هدر {HeaderName} یک شناسهٔ معتبر نیست.");

        return id;
    }
}
