using System.Security.Claims;
using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;

namespace Andookhte.Api.Services;

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUser(IHttpContextAccessor accessor) => _accessor = accessor;

    private HttpContext? Context => _accessor.HttpContext;

    public Guid? UserId
    {
        get
        {
            var value = Context?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? Context?.User.FindFirstValue("sub");

            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public bool IsAuthenticated => UserId is not null;

    public string? IpAddress => Context?.Connection.RemoteIpAddress?.ToString();

    public string? UserAgent
    {
        get
        {
            var agent = Context?.Request.Headers.UserAgent.ToString();
            if (string.IsNullOrWhiteSpace(agent)) return null;
            return agent.Length > 512 ? agent[..512] : agent;
        }
    }

    public Guid RequireUserId()
        => UserId ?? throw new UnauthorizedException();
}
