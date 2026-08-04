import { toJalaali, toGregorian, jalaaliMonthLength, jalaaliToDateObject } from 'jalaali-js';

/** هفتهٔ جلالی از شنبه شروع می‌شود */
export const JALALI_WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export interface JalaliYm {
  jy: number;
  jm: number;
}

export const todayJalali = (): JalaliYm => {
  const { jy, jm } = toJalaali(new Date());
  return { jy, jm };
};

export const addMonths = ({ jy, jm }: JalaliYm, delta: number): JalaliYm => {
  const total = jy * 12 + (jm - 1) + delta;
  return { jy: Math.floor(total / 12), jm: ((total % 12) + 12) % 12 + 1 };
};

export const sameMonth = (a: JalaliYm, b: JalaliYm): boolean => a.jy === b.jy && a.jm === b.jm;

/**
 * روزهای ماه به‌همراه سلول‌های خالی ابتدای ماه، برای چیدمان شبکهٔ تقویم.
 * getDay خودِ جاوااسکریپت یکشنبه را ۰ می‌گیرد؛ +۱ و باقیمانده بر ۷ آن را به
 * هفتهٔ جلالی (شنبه = ۰) می‌چرخاند.
 */
export const monthGridDays = (jy: number, jm: number): (number | null)[] => {
  const length = jalaaliMonthLength(jy, jm);
  const firstWeekday = (jalaaliToDateObject(jy, jm, 1).getDay() + 1) % 7;

  const days: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let d = 1; d <= length; d++) days.push(d);
  return days;
};

const dayKey = (jy: number, jm: number, jd: number): string => `${jy}-${jm}-${jd}`;

/** کلید همان روز از یک تاریخ UTC — برای گروه‌بندی قسط‌ها روی سلول‌های تقویم */
export const jalaliKeyOfUtcDate = (isoUtc: string): string => {
  const { jy, jm, jd } = toJalaali(new Date(isoUtc));
  return dayKey(jy, jm, jd);
};

export const jalaliKeyOf = (jy: number, jm: number, jd: number): string => dayKey(jy, jm, jd);

/**
 * تاریخ جلالی انتخاب‌شده در فرم → ISO برای ارسال به سرور. لنگر روی ظهر UTC است
 * (نه نیمه‌شب) تا با تبدیل به وقت محلی ایران، روز تقویمی هرگز یک روز جابه‌جا نشود.
 */
export const jalaliToIsoDate = (jy: number, jm: number, jd: number): string => {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0)).toISOString();
};

/** برای نمایش «امروز» به‌عنوان jy/jm/jd */
export const jalaliOfDate = (date: Date): { jy: number; jm: number; jd: number } => toJalaali(date);
