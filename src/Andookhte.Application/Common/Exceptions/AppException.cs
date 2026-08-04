using System.Net;

namespace Andookhte.Application.Common.Exceptions;

/// <summary>
/// پایهٔ خطاهای قابل انتظار برنامه. میان‌افزار خطا در لایهٔ API این‌ها را
/// به پاسخ ProblemDetails با کد وضعیت مناسب تبدیل می‌کند.
/// </summary>
public abstract class AppException : Exception
{
    public abstract HttpStatusCode StatusCode { get; }

    protected AppException(string message) : base(message) { }
}

/// <summary>ورودی نامعتبر — 400</summary>
public class ValidationException : AppException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.BadRequest;
    public ValidationException(string message) : base(message) { }
}

/// <summary>احراز هویت ناموفق یا توکن نامعتبر — 401</summary>
public class UnauthorizedException : AppException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Unauthorized;
    public UnauthorizedException(string message = "برای انجام این عملیات باید وارد شوید.") : base(message) { }
}

/// <summary>کاربر احراز هویت شده ولی سطح دسترسی کافی ندارد — 403</summary>
public class ForbiddenException : AppException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Forbidden;
    public ForbiddenException(string message = "سطح دسترسی شما برای این عملیات کافی نیست.") : base(message) { }
}

/// <summary>منبع یافت نشد — 404</summary>
public class NotFoundException : AppException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.NotFound;
    public NotFoundException(string message) : base(message) { }
}

/// <summary>تعارض با وضعیت فعلی، مثل ایمیل تکراری — 409</summary>
public class ConflictException : AppException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Conflict;
    public ConflictException(string message) : base(message) { }
}

/// <summary>تعداد درخواست بیش از حد مجاز — 429</summary>
public class TooManyRequestsException : AppException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.TooManyRequests;
    public TooManyRequestsException(string message) : base(message) { }
}
