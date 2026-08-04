# اندوخته — فرانت‌اند

داشبورد مالی شخصی و کسب‌وکار. React ۱۹ + TypeScript + Vite + Tailwind CSS v4.

## اجرا

```bash
npm install
npm run dev      # سرور توسعه
npm run build    # خروجی تولید در dist/
npm run lint     # بررسی کد
```

> آدرس API از متغیر محیطی خوانده می‌شود. یک فایل `.env.local` بسازید:
>
> ```
> VITE_API_BASE_URL=https://localhost:7101/api
> ```
>
> `VITE_USER_ID` حذف شده — هویت کاربر از توکن ورود می‌آید.

## احراز هویت

تا وقتی کاربر وارد نشده باشد، هیچ صفحه‌ای از اپ رندر نمی‌شود (`Gate` در `App.tsx`). دو مسیر ورود موجود است: ایمیل و رمز، یا کد یک‌بارمصرف پیامکی.

**مدیریت توکن.** `api.ts` دو اینترسپتور دارد: یکی `Authorization` و `X-Workspace-Id` را به هر درخواست می‌چسباند، دیگری روی خطای ۴۰۱ توکن را تمدید و درخواست را تکرار می‌کند. تمدید **تک‌پروازه** است — اگر ده درخواست هم‌زمان ۴۰۱ بگیرند، فقط یک بار `refresh` صدا زده می‌شود و بقیه منتظر همان نتیجه می‌مانند. اگر تمدید شکست بخورد، رویداد `andookhte:session-expired` منتشر و کاربر به صفحهٔ ورود برگردانده می‌شود.

**فضای کاری.** سوییچ فضای کاری در سایدبار (دسکتاپ) و نوار بالا (موبایل) است. با تعویض، فقط هدر عوض می‌شود و `FinanceProvider` داده را از نو می‌خواند — نیازی به ورود مجدد نیست.

> توکن‌ها در `localStorage` نگهداری می‌شوند تا با رفرش صفحه از بین نروند. این روش در برابر XSS آسیب‌پذیر است؛ امن‌ترین جایگزین کوکی `httpOnly` است که نیازمند تغییر سمت سرور و محافظت CSRF است.

## ساختار

```
src/
├── api.ts                  اتصال به بک‌اند + نرمال‌سازی پاسخ سرور
├── index.css               توکن‌های دیزاین، دارک‌مود، انیمیشن‌های سراسری
├── router/                 روتر سبک مبتنی بر History API (بدون وابستگی)
├── store/                  ThemeProvider و FinanceProvider (context)
├── hooks/                  useAnimatedNumber، useMediaQuery، haptic
├── lib/
│   ├── format.ts           اعداد و تاریخ فارسی، فرمت شمارهٔ کارت
│   ├── banks.ts            تشخیص بانک از IIN کارت + پالت هر بانک
│   ├── categories.ts       دسته‌بندی‌ها با آیکون و رنگ
│   ├── analytics.ts        محاسبات تحلیلی (روند، دسته، مقایسهٔ ماهانه)
│   ├── demoData.ts         دادهٔ نمایشی
│   └── nav.ts              تعریف مسیرها
├── components/
│   ├── ui/                 GlassCard, Button, Field, Modal, Segmented, Skeleton, AnimatedNumber
│   ├── charts/             DonutChart, TrendChart, BarsChart (SVG دست‌ساز)
│   ├── layout/             Sidebar, TopBar, BottomNav
│   ├── BankCard.tsx        کارت بانکی سه‌بعدی با تیلت و درخشش
│   ├── StatCard.tsx        کارت شاخص با شمارندهٔ متحرک
│   ├── TransactionRow.tsx  سطر تراکنش
│   └── TransactionForm.tsx فرم ثبت درآمد/هزینه/انتقال
└── pages/                  Dashboard, Accounts, Transactions, Analytics, Inventory
```

## نکات پیاده‌سازی

**بدون وابستگی اضافه.** روتر، انیمیشن‌ها و نمودارها همگی داخلی‌اند؛ تنها وابستگی‌های زمان اجرا `react`، `axios` و `lucide-react` هستند.

**دیزاین.** Glassmorphism با `backdrop-filter`، پس‌زمینهٔ گرادیانی متحرک (Aurora) و دارک‌مود مبتنی بر کلاس `.dark` که پیش از رنگ‌آمیزی اولیه در `index.html` اعمال می‌شود تا پرش رنگ رخ ندهد.

**انیمیشن.** کی‌فریم‌های سراسری در `index.css` (`rise`، `page-in`، `sheet-in`، `draw-line`، `donut-draw`، `grow-up`). شمارندهٔ اعداد با `requestAnimationFrame` و easing نمایی. همهٔ انیمیشن‌ها با `prefers-reduced-motion` غیرفعال می‌شوند.

**نمودارها.** SVG خالص با `pathLength="1"` برای انیمیشن یکنواخت رسم، منحنی نرم کاردینال، گرادیان ناحیه‌ای و تولتیپ تعاملی.

**PWA.** `manifest.webmanifest` به‌همراه سرویس‌ورکر (`public/sw.js`) با استراتژی network-first برای ناوبری و cache-first برای دارایی‌ها. فقط در بیلد تولید ثبت می‌شود.

**موبایل.** نوار ناوبری پایینی با دکمهٔ شناور ثبت تراکنش، `env(safe-area-inset-bottom)`، بازخورد لمسی (Vibration API) و اسکلتون‌لودر هنگام دریافت داده.

## استقرار

روتر از History API استفاده می‌کند، پس سرور باید همهٔ مسیرها را به `index.html` هدایت کند:

- **Nginx:** `try_files $uri $uri/ /index.html;`
- **IIS / ASP.NET:** قانون rewrite به `/index.html`
- **Netlify:** `/* /index.html 200`
