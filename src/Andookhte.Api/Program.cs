using System.Text;
using Andookhte.Api.Controllers;
using Andookhte.Api.Middleware;
using Andookhte.Api.Services;
using Andookhte.Application;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Infrastructure;
using Andookhte.Infrastructure.Persistence;
using Andookhte.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

/* ————————————————— هدرهای پراکسی ————————————————— */

// پشت پراکسی معکوس (لیارا، آروان، nginx) آدرس و پروتکل واقعی کاربر در هدرهای
// X-Forwarded-* می‌آید. بدون این پیکربندی، محدودسازی نرخ همهٔ کاربران را یک IP
// می‌بیند و تشخیص HTTPS هم اشتباه می‌شود.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    // شبکهٔ پراکسی از پیش معلوم نیست، بنابراین فهرست پیش‌فرض پاک می‌شود.
    // این تنظیم فقط وقتی امن است که اپ مستقیماً از اینترنت قابل دسترسی نباشد.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

/* ————————————————— CORS ————————————————— */

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:5173", "http://localhost:5174"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

/* ————————————————— احراز هویت ————————————————— */

var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();

if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey) || jwtOptions.SigningKey.Length < 32)
{
    throw new InvalidOperationException(
        "کلید Jwt:SigningKey تنظیم نشده یا کوتاه‌تر از ۳۲ نویسه است. " +
        "در توسعه از appsettings.Development.json و در تولید از متغیر محیطی استفاده کنید.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            // پیش‌فرض پنج دقیقه است و باعث می‌شود توکن منقضی همچنان پذیرفته شود
            ClockSkew = TimeSpan.FromSeconds(15)
        };
    });

builder.Services.AddAuthorization();

/* ————————————————— سرویس‌ها ————————————————— */

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<WorkspaceContext>();
builder.Services.AddScoped<IWorkspaceContext>(provider => provider.GetRequiredService<WorkspaceContext>());

builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddAndookhteRateLimiting();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Andookhte API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "توکن دسترسی را بدون پیشوند Bearer وارد کنید."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });

    options.AddSecurityDefinition("Workspace", new OpenApiSecurityScheme
    {
        Name = WorkspaceResolutionMiddleware.HeaderName,
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "شناسهٔ فضای کاری فعال. اگر خالی بماند، نخستین فضای کاری کاربر انتخاب می‌شود."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Workspace" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

/* ————————————————— مهاجرت دیتابیس ————————————————— */

using (var scope = app.Services.CreateScope())
{
    // EnsureCreated جای Migrate را نمی‌گیرد: با آن مهاجرت‌ها هرگز اجرا نمی‌شوند
    // و اسکیمای دیتابیس از مدل عقب می‌ماند.
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // بدون این بررسی، نبودِ مهاجرت به‌جای خطای واضح در استارتاپ،
    // به خطای مبهم «no such table» در نخستین درخواست تبدیل می‌شود.
    if (!context.Database.GetMigrations().Any())
    {
        throw new InvalidOperationException(
            "هیچ مهاجرتی در پروژهٔ Infrastructure وجود ندارد. یک بار این دستور را اجرا کنید:\n" +
            "dotnet ef migrations add InitialCreate " +
            "--project ../Andookhte.Infrastructure --startup-project .");
    }

    // MigrateAsync در EF Core 8 از EnableRetryOnFailure عبور نمی‌کند. کانتینر معمولاً
    // پیش از آماده شدن دیتابیس مدیریت‌شده بالا می‌آید، پس بدون این پوشش، یک قطعی
    // لحظه‌ای شبکه کل استارتاپ را می‌کشد.
    var strategy = context.Database.CreateExecutionStrategy();
    await strategy.ExecuteAsync(() => context.Database.MigrateAsync());
}

// باید نخستین میان‌افزار باشد تا بقیهٔ زنجیره آدرس و پروتکل واقعی کاربر را ببینند
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

// در محیط تولید، پایان TLS روی پراکسی انجام می‌شود و اپ داخل شبکهٔ خصوصی
// روی HTTP گوش می‌دهد؛ فعال‌کردن ریدایرکت آنجا حلقهٔ بی‌پایان می‌سازد.
if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("AllowReactApp");

// پیش از احراز هویت قرار می‌گیرد تا سیل درخواست حتی به لایهٔ تأیید توکن هم نرسد
app.UseRateLimiter();

app.UseAuthentication();
app.UseMiddleware<WorkspaceResolutionMiddleware>();
app.UseAuthorization();

app.MapControllers();

// بررسی سلامت برای پراکسی و سامانهٔ میزبانی — بدون احراز هویت و بدون محدودیت نرخ
app.MapGet("/health", () => Results.Ok(new { status = "ok", utc = DateTime.UtcNow }))
   .AllowAnonymous()
   .DisableRateLimiting();

app.Run();
