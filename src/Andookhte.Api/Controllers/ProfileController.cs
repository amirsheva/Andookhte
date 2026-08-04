using Andookhte.Application.Features.Auth;
using Andookhte.Application.Features.Profile;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Andookhte.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProfileController(IMediator mediator) => _mediator = mediator;

    [HttpPut]
    public async Task<ActionResult<UserDto>> Update([FromBody] UpdateProfileCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>
    /// نشست تازه برمی‌گرداند، چون تغییر رمز همهٔ نشست‌های قبلی را باطل می‌کند.
    /// کلاینت باید توکن‌های برگشتی را جایگزین کند وگرنه بلافاصله بیرون می‌افتد.
    /// </summary>
    [HttpPut("password")]
    public async Task<ActionResult<AuthResultDto>> ChangePassword(
        [FromBody] ChangePasswordCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    /// <summary>ارسال کد تأیید به ایمیل یا شمارهٔ موبایل ثبت‌شدهٔ کاربر.</summary>
    [HttpPost("verify/send")]
    public async Task<ActionResult<RequestOtpResultDto>> SendVerification(
        [FromBody] SendContactVerificationCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));

    [HttpPost("verify/confirm")]
    public async Task<ActionResult<UserDto>> ConfirmVerification(
        [FromBody] ConfirmContactCommand command, CancellationToken ct)
        => Ok(await _mediator.Send(command, ct));
}
