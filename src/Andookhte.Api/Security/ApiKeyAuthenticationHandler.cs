using System.Security.Claims;
using System.Text.Encodings.Web;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Application.Features.ApiKeys;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Andookhte.Api.Security;

/// <summary>نام claim سفارشی‌ای که فضای کاریِ متصل به کلید API را حمل می‌کند.</summary>
public static class ApiKeyClaimTypes
{
    public const string WorkspaceId = "andk_workspace_id";
}

/// <summary>
/// اتوماسیون‌هایی مثل شورتکات آیفون نمی‌توانند جریان ورود معمولی (ایمیل/رمز → JWT کوتاه‌عمر)
/// را طی کنند. این هندلر یک کلید ثابت و طولانی‌عمر (ساخته‌شده در تنظیمات کاربر) را می‌پذیرد
/// و همان claim هایی را می‌سازد که JwtBearer برای توکن معمولی می‌ساخت — پس بقیهٔ خط لولهٔ
/// اپ (WorkspaceResolutionMiddleware، ICurrentUser، IWorkspaceContext) بدون تغییر کار می‌کند.
/// </summary>
public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "ApiKey";

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var raw = Request.Headers.Authorization.ToString();
        if (!raw.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();

        var key = raw["Bearer ".Length..].Trim();
        if (!key.StartsWith(CreateApiKeyCommandHandler.Prefix, StringComparison.Ordinal))
            return AuthenticateResult.NoResult();

        var context = Context.RequestServices.GetRequiredService<IAppDbContext>();
        var tokens = Context.RequestServices.GetRequiredService<ITokenService>();

        var hash = tokens.HashToken(key);
        var apiKey = await context.ApiKeys
            .FirstOrDefaultAsync(k => k.KeyHash == hash && k.RevokedAtUtc == null, Context.RequestAborted);

        if (apiKey is null)
            return AuthenticateResult.Fail("کلید API نامعتبر یا باطل‌شده است.");

        apiKey.LastUsedAtUtc = DateTime.UtcNow;
        await context.SaveChangesAsync(Context.RequestAborted);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, apiKey.UserId.ToString()),
            new Claim(ApiKeyClaimTypes.WorkspaceId, apiKey.WorkspaceId.ToString())
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);

        return AuthenticateResult.Success(ticket);
    }
}
