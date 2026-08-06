# استقرار اندوخته

راهنمای انتشار روی سرور ایرانی. نمونه‌ها با لیارا نوشته شده‌اند ولی چون همه‌چیز داکر است،
روی آروان یا هر VPS دیگری هم با همان منطق کار می‌کند.

---

## روند همیشگی (روش فعلی — VPS + Docker از پیش‌ساخته)

از این به بعد هر deploy همین ۵ مرحله است، به همین ترتیب. جزئیات هرکدام و راه‌حل مشکلات
رایج در بخش «روش پیشنهادی» پایین‌تر هست؛ این‌جا فقط چک‌لیست سریع است.

**۱) ساخت خروجی — روی سیستم خودت (Windows)**

```powershell
cd D:\Amir\Andookhte
powershell -ExecutionPolicy Bypass -File .\publish.ps1 -ApiUrl "http://95.38.188.15/api"
```

**۲) کامیت و پوش**

```bash
git add -A
git commit -m "توضیح کوتاه تغییرات"
git push
```

**۳) انتقال فایل‌ها به سرور (FileZilla)** — در `/opt/andookhte`، جایگزین نسخه‌ی قبلی کن:

| این دور چه چیزی تغییر کرده | چه چیزی را آپلود کن |
|---|---|
| فقط فرانت‌اند (ظاهر، صفحات) | فقط `andookhte-web/dist/` |
| بک‌اند هم عوض شده (Controller، Command، Entity، مایگریشن) | هم `deploy/api/` هم `andookhte-web/dist/` |
| `nginx.conf` / `Dockerfile.prebuilt` / `docker-compose.prebuilt.yml` | همان فایل خاص را هم بفرست (به‌ندرت) |

**۴) روی سرور (SSH)**

```bash
cd /opt/andookhte
docker compose -f docker-compose.prebuilt.yml up -d --build
```

مایگریشن‌های جدید بک‌اند خودکار موقع بالا آمدن اجرا می‌شوند — دستور دستی لازم نیست.

**۵) تأیید**

```bash
docker compose -f docker-compose.prebuilt.yml ps
docker compose -f docker-compose.prebuilt.yml logs api --tail 50
```

و در مرورگر: `http://95.38.188.15`

> **هرگز** روی سرور `docker compose down -v` نزن مگر واقعاً بخواهی دیتابیس واقعی پاک شود —
> این فلگ ولوم دیتابیس را هم حذف می‌کند.

---

## ۰. تغییر مهم: دیتابیس دیگر SQLite نیست

پروژه به **PostgreSQL** منتقل شد و SQLite کاملاً حذف شد. دو دلیل:

**SQLite نوع `decimal` ندارد** و آن را به‌صورت متن ذخیره می‌کند. یعنی هر `ORDER BY`،
`WHERE balance > x` و `SUM(amount)` در سطح SQL نادرست است. تا امروز با مرتب‌سازی در
حافظه دورش زدیم چون تعداد حساب‌ها کم است، ولی با ورود انبار — که یعنی جمع قیمت روی
هزاران کالا — این ترفند جواب نمی‌دهد.

**SQLite برای چندکاربره ساخته نشده.** هر نوشتن کل فایل دیتابیس را قفل می‌کند.

> مهاجرت‌های EF Core **مخصوص پروایدر** هستند، پس مهاجرت قدیمی SQLite حذف شد.
> باید یک بار مهاجرت تازه بسازید (گام ۱).

---

## ۱. راه‌اندازی محلی با PostgreSQL

```bash
cd D:\Amir\Andookhte
docker compose up -d          # پستگرس روی پورت ۵۴۳۲

cd src/Andookhte.Api
dotnet ef migrations add InitialCreate --project ../Andookhte.Infrastructure --startup-project .
dotnet run
```

رشتهٔ اتصال توسعه از قبل در `appsettings.Development.json` هست. اگر پستگرس را جای
دیگری بالا آورده‌اید، متغیر `ANDOOKHTE_CONNECTION` را برای دستور `dotnet ef` ست کنید.

فرانت‌اند مثل قبل:

```bash
cd andookhte-web
npm run dev
```

---

## ۲. ساخت دیتابیس روی لیارا

از پنل، یک دیتابیس **PostgreSQL** بسازید. رشتهٔ اتصالی که می‌دهد قالب URI دارد
(`postgres://user:pass@host:port/db`) ولی Npgsql قالب کلید-مقدار می‌خواهد:

```
Host=<host>;Port=<port>;Database=<db>;Username=<user>;Password=<pass>;SSL Mode=Require;Trust Server Certificate=true
```

---

## ۳. انتشار API

متغیرهای محیطی را در پنل تنظیم کنید. نام‌گذاری با دو زیرخط، معادل تودرتویی JSON است:

| متغیر | مقدار |
|---|---|
| `ConnectionStrings__DefaultConnection` | رشتهٔ اتصال گام ۲ |
| `Jwt__SigningKey` | رشتهٔ تصادفی **حداقل ۳۲ نویسه** |
| `Cors__AllowedOrigins__0` | `https://andookhte.liara.run` (دامنهٔ فرانت) |
| `Cors__AllowedOrigins__1` | دامنهٔ دوم، اگر دارید |
| `Sms__ApiKey` | کلید پنل پیامک |
| `Sms__Template` | نام الگوی تأییدشده |
| `Smtp__Host` | مثلاً `smtp.gmail.com` — خالی یعنی ایمیل بازیابی فقط در لاگ |
| `Smtp__Port` | `587` |
| `Smtp__Username` / `Smtp__Password` | با Gmail: ایمیل کامل و یک App Password |
| `Smtp__FromAddress` | همان ایمیل فرستنده |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

کلید امضا را این‌طور بسازید:

```bash
openssl rand -base64 48
```

سپس:

```bash
liara deploy --app andookhte-api --port 8080
```

> برنامه اگر `Jwt__SigningKey` تنظیم نشده یا کوتاه‌تر از ۳۲ نویسه باشد **عمداً بالا نمی‌آید**.
> این خطای صریح در استارتاپ بهتر از یک اپ ظاهراً سالم با توکن‌های قابل جعل است.

مهاجرت‌ها هنگام بالا آمدن خودکار اجرا می‌شوند (`Database.MigrateAsync()`).

---

## ۴. انتشار فرانت‌اند

**آدرس API در زمان ساخت داخل باندل نوشته می‌شود، نه زمان اجرا.** Vite متغیرهای
`VITE_*` را موقع build جایگزین می‌کند؛ پس تغییر آدرس API یعنی deploy دوباره.

در `andookhte-web/liara.json` مقدار `VITE_API_BASE_URL` را به دامنهٔ واقعی API خود
تغییر دهید، بعد:

```bash
cd andookhte-web
liara deploy --app andookhte --port 80
```

---

## ۵. چک‌لیست پیش از دادن آدرس به کاربر

- [ ] `https://<api>/health` پاسخ `{"status":"ok"}` می‌دهد
- [ ] ثبت‌نام با ایمیل کار می‌کند و بعد از آن داشبورد بالا می‌آید
- [ ] ورود با پیامک کد واقعی می‌فرستد — نه فقط لاگ
- [ ] یک حساب بسازید، یک تراکنش ثبت کنید، ویرایش و حذفش کنید و موجودی را چک کنید
- [ ] با دو کاربر مختلف وارد شوید و مطمئن شوید هیچ‌کدام دادهٔ دیگری را نمی‌بیند
- [ ] Swagger در تولید **باز نیست** (فقط در Development فعال است)
- [ ] بک‌آپ خودکار دیتابیس در پنل فعال است

آن مورد جداسازی داده را واقعاً تست کنید. فیلتر سراسری کوئری آن را تضمین می‌کند،
ولی این تنها چیزی است که اگر خراب باشد، اعتماد کاربر برنمی‌گردد.

---

## روش پیشنهادی: ساخت روی سیستم خودتان، اجرا روی سرور

سرور ایرانی به NuGet دسترسی ندارد و با یک گیگ رم، مرحلهٔ کامپایل ممکن است بی‌پیام
kill شود. سیستم شما هیچ‌کدام از این دو مشکل را ندارد. پس کامپایل را همان‌جا انجام
دهید و فقط خروجی را ببرید — سرور نه به SDK نیاز دارد، نه به NuGet، نه به Node.

### روی ویندوز

```powershell
cd D:\Amir\Andookhte
.\publish.ps1 -ApiUrl "http://95.38.188.15/api"
```

> پورت API دیگر مستقیماً به بیرون باز نیست — nginx در کانتینر `web` مسیر `/api` را به کانتینر
> `api` پراکسی می‌کند (به همین دلیل بدون `:8080`).

### انتقال با FileZilla

این‌ها را در `/opt/andookhte` روی سرور بگذارید:

```
deploy/api/                          خروجی بک‌اند
andookhte-web/dist/                  خروجی فرانت‌اند
andookhte-web/nginx.conf
andookhte-web/security-headers.conf
andookhte-web/Dockerfile.prebuilt
src/Andookhte.Api/Dockerfile.prebuilt
docker-compose.prebuilt.yml
.env                                 از روی .env.example
```

پوشهٔ `src/` (کد منبع) لازم نیست — فقط آن یک داکرفایل.

### روی سرور

```bash
cd /opt/andookhte
cp .env.example .env && nano .env      # رمزها را پر کنید
docker compose -f docker-compose.prebuilt.yml up -d --build
docker compose -f docker-compose.prebuilt.yml logs -f api
```

ساخت چند ثانیه طول می‌کشد چون فقط کپی است. برای به‌روزرسانی‌های بعدی، `publish.ps1`
را دوباره اجرا کنید، `deploy/api` و `dist` را جایگزین کنید و همان `up -d --build`
را بزنید.

> کلید JWT را با `openssl rand -base64 48` بسازید. برنامه با کلید کوتاه‌تر از
> ۳۲ نویسه عمداً بالا نمی‌آید.

---

## خطای NU1301 هنگام ساخت روی سرور

```
error NU1301: Unable to load the service index for source https://api.nuget.org/v3/index.json
```

`api.nuget.org` از ایران در دسترس نیست. اگر خطا پس از چند دقیقه معطلی می‌آید، مسئله
تایم‌اوت شبکه است نه پیکربندی. فایل `NuGet.config` در ریشهٔ پروژه مخزن را به آینهٔ
داخلی تغییر می‌دهد و داکرفایل پیش از `restore` آن را کپی می‌کند.

اگر آینهٔ فعلی از کار افتاد، در `NuGet.config` یکی از گزینه‌های کامنت‌شده را جایگزین
کنید. **هم‌زمان چند آینه را فعال نگذارید** — NuGet همهٔ منابع را پرس‌وجو می‌کند و یک
منبع کند، کل `restore` را کند می‌کند.

پس از تغییر، کش داکر را دور بزنید وگرنه لایهٔ خراب restore دوباره استفاده می‌شود:

```bash
docker compose build --no-cache api
docker compose up -d
```

---

## اگر سرور کم‌حافظه است

روی سرور ۱ گیگابایتی، مرحلهٔ `dotnet publish` ممکن است بدون پیام روشن kill شود.
داکرفایل با `/m:1` و `UseSharedCompilation=false` مصرف را پایین نگه می‌دارد، ولی اگر
باز هم شکست خورد، سواپ اضافه کنید:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

جایگزین مطمئن‌تر: ایمیج را روی سیستم خودتان بسازید و به رجیستری ابری ایرانی
push کنید، سرور فقط pull کند. آن وقت سرور اصلاً به NuGet و کامپایلر نیاز ندارد.

---

## نکاتی که ممکن است به آن‌ها بخورید

**تاریخ‌ها.** Npgsql مقدار `DateTime` با `Kind` غیر از `Utc` را رد می‌کند و تاریخ‌های
آمده از JSON کلاینت معمولاً `Unspecified` هستند. یک تبدیل سراسری در `AppDbContext`
همهٔ آن‌ها را UTC تعبیر می‌کند، پس این خطا نباید رخ دهد — ولی اگر جایی دیدید،
منشأش همین‌جاست.

**IP پشت پراکسی.** میان‌افزار `ForwardedHeaders` فعال است تا محدودسازی نرخ IP واقعی
کاربر را ببیند نه IP پراکسی را. `KnownProxies` عمداً خالی است؛ این فقط وقتی امن است
که کانتینر مستقیماً از اینترنت در دسترس نباشد — که در لیارا و آروان همین‌طور است.

**ریدایرکت HTTPS** در تولید غیرفعال است. پایان TLS روی پراکسی انجام می‌شود و اپ داخل
شبکه روی HTTP گوش می‌دهد؛ فعال بودنش حلقهٔ بی‌پایان می‌سازد.

**سرویس‌ورکر کش نمی‌شود.** در `nginx.conf` برای `/sw.js` هدر `no-store` گذاشته شده،
وگرنه نسخهٔ قدیمی اپ روی دستگاه کاربر گیر می‌کند و به‌روزرسانی‌ها هرگز نمی‌رسند.

**CORS در تولید.** فهرست مبدأهای مجاز عمداً در `appsettings.json` نیست و فقط در
`appsettings.Development.json` مقدار دارد. دلیلش این است که پیکربندی .NET آرایه‌ها را
بر اساس **اندیس** ادغام می‌کند: اگر مقدار پیش‌فرضی وجود داشت، تنظیم
`Cors__AllowedOrigins__0` در تولید فقط عنصر اول را جایگزین می‌کرد و `localhost:5174`
به‌عنوان یک مبدأ مجاز زنده باقی می‌ماند — آن هم در کنار `AllowCredentials`.

**بازگشت به عقب.** اگر deploy جدید مشکل داشت، مهاجرت‌های اجراشده خودکار برنمی‌گردند.
پیش از هر deploy که مهاجرت دارد، از دیتابیس بک‌آپ بگیرید.
