using Andookhte.Application.Features.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Andookhte.Api.Controllers;

/// <summary>
/// توجه: <c>[AllowAnonymous]</c> عمداً روی کلاس گذاشته نشده. میان‌افزار مجوزدهی
/// به‌محض دیدن هر <c>IAllowAnonymous</c> در متادیتای اندپوینت — چه از کلاس، چه از اکشن —
/// ارزیابی سیاست را کامل رد می‌کند. اگر روی کلاس بود، <c>[Authorize]</c> روی اکشن Me
/// بی‌اثر می‌شد و آن اندپوینت بدون توکن هم قابل دسترسی بود.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting(RateLimitPolicies.Auth)]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator) => _mediator = mediator;

    /// <summary>ثبت‌نام با ایمیل و رمز عبور. یک فضای کاری شخصی هم ساخته می‌شود.</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> Register([FromBody] RegisterCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>ورود با ایمیل و رمز عبور.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> Login([FromBody] LoginCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>درخواست کد یک‌بارمصرف پیامکی.</summary>
    [HttpPost("otp/request")]
    [AllowAnonymous]
    public async Task<ActionResult<RequestOtpResultDto>> RequestOtp(
        [FromBody] RequestOtpCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>تأیید کد یک‌بارمصرف. اگر کاربر تازه باشد، همین‌جا ساخته می‌شود.</summary>
    [HttpPost("otp/verify")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> VerifyOtp(
        [FromBody] VerifyOtpCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>درخواست کد بازیابی رمز با ایمیل یا شمارهٔ موبایل.</summary>
    [HttpPost("password/forgot")]
    [AllowAnonymous]
    public async Task<ActionResult<RequestOtpResultDto>> ForgotPassword(
        [FromBody] RequestPasswordResetCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>تعیین رمز تازه با کد بازیابی. همهٔ نشست‌های قبلی باطل می‌شوند.</summary>
    [HttpPost("password/reset")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> ResetPassword(
        [FromBody] ResetPasswordCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>تمدید نشست با توکن تمدید. توکن قبلی باطل و توکن تازه صادر می‌شود.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResultDto>> Refresh(
        [FromBody] RefreshTokenCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>خروج از نشست جاری یا همهٔ دستگاه‌ها.</summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] LogoutCommand command, CancellationToken ct)
    {
        await _mediator.Send(command, ct);
        return NoContent();
    }

    /// <summary>اطلاعات کاربر جاری به همراه فهرست فضاهای کاری او.</summary>
    [HttpGet("me")]
    [Authorize]
    [DisableRateLimiting]
    public async Task<ActionResult<MeDto>> Me(CancellationToken ct)
        => Ok(await _mediator.Send(new GetMeQuery(), ct));
}
