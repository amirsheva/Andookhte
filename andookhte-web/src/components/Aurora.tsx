/** پس‌زمینهٔ گرادیانی متحرک — پشت کل اپلیکیشن قرار می‌گیرد */
export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--app-bg)]" />
      <div
        className="animate-aurora absolute -top-40 -right-32 h-[36rem] w-[36rem] rounded-full opacity-60 blur-[110px] dark:opacity-40"
        style={{ background: 'radial-gradient(circle, rgb(51 100 255 / .55), transparent 68%)' }}
      />
      <div
        className="animate-aurora absolute top-1/3 -left-40 h-[32rem] w-[32rem] rounded-full opacity-50 blur-[110px] dark:opacity-35"
        style={{
          background: 'radial-gradient(circle, rgb(168 85 247 / .5), transparent 68%)',
          animationDelay: '-6s',
        }}
      />
      <div
        className="animate-aurora absolute -bottom-48 right-1/4 h-[30rem] w-[30rem] rounded-full opacity-45 blur-[110px] dark:opacity-30"
        style={{
          background: 'radial-gradient(circle, rgb(16 185 129 / .45), transparent 68%)',
          animationDelay: '-12s',
        }}
      />
      {/* نویز ظریف برای جلوگیری از باندینگ گرادیان */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
