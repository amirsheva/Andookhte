using System.Net;
using System.Text.Json;
using Andookhte.Application.Common.Exceptions;

namespace Andookhte.Api.Middleware;

/// <summary>
/// خطاهای قابل انتظار برنامه را به پاسخ JSON یکنواخت تبدیل می‌کند.
/// خطاهای پیش‌بینی‌نشده لاگ می‌شوند ولی جزئیاتشان به کاربر نشت نمی‌کند.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException exception)
        {
            await WriteAsync(context, (int)exception.StatusCode, exception.Message);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "خطای پیش‌بینی‌نشده در {Path}", context.Request.Path);

            var message = _environment.IsDevelopment()
                ? exception.Message
                : "خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.";

            await WriteAsync(context, (int)HttpStatusCode.InternalServerError, message);
        }
    }

    private static async Task WriteAsync(HttpContext context, int statusCode, string message)
    {
        if (context.Response.HasStarted) return;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";

        var payload = new { status = statusCode, message, traceId = context.TraceIdentifier };
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonOptions));
    }
}
