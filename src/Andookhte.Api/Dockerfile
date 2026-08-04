# context باید ریشهٔ پروژه باشد (نقطه)، نه این پوشه — چون همهٔ مسیرهای COPY
# نسبت به ریشه نوشته شده‌اند. در docker-compose:
#   context: .
#   dockerfile: src/Andookhte.Api/Dockerfile

# ————————————————— مرحلهٔ ساخت —————————————————
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# مخزن پکیج پیش از restore کپی می‌شود. بدون این، داکر به api.nuget.org می‌زند
# که از ایران در دسترس نیست و ساخت با NU1301 پس از چند دقیقه تایم‌اوت می‌شکند.
COPY NuGet.config .

# فایل‌های پروژه جدا کپی می‌شوند تا تا وقتی وابستگی‌ها عوض نشده،
# لایهٔ restore از کش استفاده کند و ساخت‌های بعدی سریع باشند.
COPY src/Andookhte.Domain/Andookhte.Domain.csproj                 src/Andookhte.Domain/
COPY src/Andookhte.Application/Andookhte.Application.csproj       src/Andookhte.Application/
COPY src/Andookhte.Infrastructure/Andookhte.Infrastructure.csproj src/Andookhte.Infrastructure/
COPY src/Andookhte.Api/Andookhte.Api.csproj                       src/Andookhte.Api/

RUN dotnet restore src/Andookhte.Api/Andookhte.Api.csproj

COPY src/ src/

# روی سرور کم‌حافظه، کامپایل موازی روچ باعث OOM می‌شود و ساخت بدون پیام روشن
# با kill مواجه می‌شود. این دو تنظیم مصرف حافظه را پایین نگه می‌دارند.
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

RUN dotnet publish src/Andookhte.Api/Andookhte.Api.csproj \
    -c Release -o /app/publish --no-restore \
    /p:UseAppHost=false /p:UseSharedCompilation=false /m:1

# ————————————————— مرحلهٔ اجرا —————————————————
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# ایمیج aspnet نه curl دارد نه wget؛ بدون این، بررسی سلامت میزبان همیشه ناموفق است
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# اجرا با کاربر غیر روت
RUN adduser --disabled-password --gecos "" --uid 10001 andookhte
USER andookhte

COPY --from=build --chown=andookhte:andookhte /app/publish .

# پایان TLS روی پراکسی میزبان انجام می‌شود؛ اپ داخل شبکه روی HTTP گوش می‌دهد
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "Andookhte.Api.dll"]
