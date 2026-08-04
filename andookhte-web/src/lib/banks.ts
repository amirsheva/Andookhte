import { toEn } from './format';

export interface BankBrand {
  key: string;
  name: string;
  /** گرادیان اصلی کارت */
  gradient: string;
  /** رنگ درخشش و هایلایت */
  accent: string;
  /** رنگ متن روی کارت */
  ink: string;
}

const FALLBACK: BankBrand = {
  key: 'unknown',
  name: 'کارت بانکی',
  gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 45%, #0f172a 100%)',
  accent: '#94a3b8',
  ink: '#f8fafc',
};

/** شش رقم ابتدایی کارت‌های شتاب → برند بانک */
const IIN_MAP: Record<string, BankBrand> = {
  '603799': { key: 'melli', name: 'بانک ملی ایران', gradient: 'linear-gradient(135deg,#0f3b2e 0%,#1f7a5c 50%,#06231b 100%)', accent: '#34d399', ink: '#ecfdf5' },
  '589210': { key: 'sepah', name: 'بانک سپه', gradient: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#0b1d54 100%)', accent: '#60a5fa', ink: '#eff6ff' },
  '627961': { key: 'sanat', name: 'بانک صنعت و معدن', gradient: 'linear-gradient(135deg,#164e63 0%,#0891b2 50%,#082f3d 100%)', accent: '#22d3ee', ink: '#ecfeff' },
  '603770': { key: 'keshavarzi', name: 'بانک کشاورزی', gradient: 'linear-gradient(135deg,#14532d 0%,#22c55e 55%,#052e16 100%)', accent: '#4ade80', ink: '#f0fdf4' },
  '628023': { key: 'maskan', name: 'بانک مسکن', gradient: 'linear-gradient(135deg,#7c2d12 0%,#ea580c 55%,#431407 100%)', accent: '#fb923c', ink: '#fff7ed' },
  '627760': { key: 'post', name: 'پست بانک ایران', gradient: 'linear-gradient(135deg,#365314 0%,#84cc16 55%,#1a2e05 100%)', accent: '#a3e635', ink: '#f7fee7' },
  '502908': { key: 'tosee-taavon', name: 'بانک توسعه تعاون', gradient: 'linear-gradient(135deg,#134e4a 0%,#14b8a6 55%,#042f2e 100%)', accent: '#2dd4bf', ink: '#f0fdfa' },
  '627412': { key: 'eghtesad', name: 'بانک اقتصاد نوین', gradient: 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 55%,#2e1065 100%)', accent: '#a78bfa', ink: '#f5f3ff' },
  '622106': { key: 'parsian', name: 'بانک پارسیان', gradient: 'linear-gradient(135deg,#3f0f2e 0%,#9d174d 55%,#2b0718 100%)', accent: '#f472b6', ink: '#fdf2f8' },
  '639194': { key: 'parsian', name: 'بانک پارسیان', gradient: 'linear-gradient(135deg,#3f0f2e 0%,#9d174d 55%,#2b0718 100%)', accent: '#f472b6', ink: '#fdf2f8' },
  '502229': { key: 'pasargad', name: 'بانک پاسارگاد', gradient: 'linear-gradient(135deg,#4a044e 0%,#c026d3 55%,#2c0330 100%)', accent: '#e879f9', ink: '#fdf4ff' },
  '639347': { key: 'pasargad', name: 'بانک پاسارگاد', gradient: 'linear-gradient(135deg,#4a044e 0%,#c026d3 55%,#2c0330 100%)', accent: '#e879f9', ink: '#fdf4ff' },
  '639599': { key: 'ghavamin', name: 'بانک قوامین', gradient: 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 55%,#082f49 100%)', accent: '#38bdf8', ink: '#f0f9ff' },
  '621986': { key: 'saman', name: 'بانک سامان', gradient: 'linear-gradient(135deg,#0b3a67 0%,#1d4ed8 55%,#061d38 100%)', accent: '#3b82f6', ink: '#eff6ff' },
  '639346': { key: 'sina', name: 'بانک سینا', gradient: 'linear-gradient(135deg,#312e81 0%,#4f46e5 55%,#1e1b4b 100%)', accent: '#818cf8', ink: '#eef2ff' },
  '502806': { key: 'shahr', name: 'بانک شهر', gradient: 'linear-gradient(135deg,#831843 0%,#db2777 55%,#4c0519 100%)', accent: '#f9a8d4', ink: '#fdf2f8' },
  '504706': { key: 'shahr', name: 'بانک شهر', gradient: 'linear-gradient(135deg,#831843 0%,#db2777 55%,#4c0519 100%)', accent: '#f9a8d4', ink: '#fdf2f8' },
  '603769': { key: 'saderat', name: 'بانک صادرات ایران', gradient: 'linear-gradient(135deg,#0f2f5f 0%,#1e5faa 55%,#071a36 100%)', accent: '#7dd3fc', ink: '#f0f9ff' },
  '610433': { key: 'mellat', name: 'بانک ملت', gradient: 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#450a0a 100%)', accent: '#fca5a5', ink: '#fef2f2' },
  '991975': { key: 'mellat', name: 'بانک ملت', gradient: 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#450a0a 100%)', accent: '#fca5a5', ink: '#fef2f2' },
  '589463': { key: 'refah', name: 'بانک رفاه کارگران', gradient: 'linear-gradient(135deg,#134e4a 0%,#0d9488 55%,#032726 100%)', accent: '#5eead4', ink: '#f0fdfa' },
  '627381': { key: 'ansar', name: 'بانک انصار', gradient: 'linear-gradient(135deg,#1c1917 0%,#57534e 55%,#0c0a09 100%)', accent: '#d6d3d1', ink: '#fafaf9' },
  '505785': { key: 'day', name: 'بانک دی', gradient: 'linear-gradient(135deg,#422006 0%,#a16207 55%,#1c1917 100%)', accent: '#fbbf24', ink: '#fffbeb' },
  '636214': { key: 'ayandeh', name: 'بانک آینده', gradient: 'linear-gradient(135deg,#172554 0%,#3b82f6 55%,#0b1120 100%)', accent: '#93c5fd', ink: '#eff6ff' },
  '636795': { key: 'markazi', name: 'بانک مرکزی', gradient: 'linear-gradient(135deg,#1f2937 0%,#4b5563 55%,#030712 100%)', accent: '#cbd5e1', ink: '#f8fafc' },
  '639607': { key: 'sarmayeh', name: 'بانک سرمایه', gradient: 'linear-gradient(135deg,#292524 0%,#78716c 55%,#0c0a09 100%)', accent: '#e7e5e4', ink: '#fafaf9' },
  '627488': { key: 'karafarin', name: 'بانک کارآفرین', gradient: 'linear-gradient(135deg,#164e63 0%,#0e7490 55%,#083344 100%)', accent: '#67e8f9', ink: '#ecfeff' },
  '502910': { key: 'karafarin', name: 'بانک کارآفرین', gradient: 'linear-gradient(135deg,#164e63 0%,#0e7490 55%,#083344 100%)', accent: '#67e8f9', ink: '#ecfeff' },
  '505416': { key: 'gardeshgari', name: 'بانک گردشگری', gradient: 'linear-gradient(135deg,#701a75 0%,#a21caf 55%,#3b0764 100%)', accent: '#f0abfc', ink: '#fdf4ff' },
  '606373': { key: 'mehr-iran', name: 'بانک قرض‌الحسنه مهر ایران', gradient: 'linear-gradient(135deg,#14532d 0%,#15803d 55%,#052e16 100%)', accent: '#86efac', ink: '#f0fdf4' },
  '628157': { key: 'tosee', name: 'مؤسسه اعتباری توسعه', gradient: 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 55%,#0f0d2b 100%)', accent: '#a5b4fc', ink: '#eef2ff' },
  '507677': { key: 'noor', name: 'مؤسسه اعتباری نور', gradient: 'linear-gradient(135deg,#0f172a 0%,#334155 55%,#020617 100%)', accent: '#cbd5e1', ink: '#f8fafc' },
  '585983': { key: 'tejarat', name: 'بانک تجارت', gradient: 'linear-gradient(135deg,#164e63 0%,#0369a1 55%,#082f49 100%)', accent: '#38bdf8', ink: '#f0f9ff' },
  '627353': { key: 'tejarat', name: 'بانک تجارت', gradient: 'linear-gradient(135deg,#164e63 0%,#0369a1 55%,#082f49 100%)', accent: '#38bdf8', ink: '#f0f9ff' },
  '639217': { key: 'keshavarzi', name: 'بانک کشاورزی', gradient: 'linear-gradient(135deg,#14532d 0%,#22c55e 55%,#052e16 100%)', accent: '#4ade80', ink: '#f0fdf4' },
};

/** برندهای پرکاربرد برای انتخاب دستی */
export const BANK_OPTIONS = Array.from(
  new Map(Object.values(IIN_MAP).map((b) => [b.key, b])).values(),
).sort((a, b) => a.name.localeCompare(b.name, 'fa'));

/** نام‌های جای‌گیر که نباید به‌عنوان نام بانک نمایش داده شوند */
const PLACEHOLDER_NAME =
  /^(string\d*|str|test\d*|sample|example|foo|bar|dummy|n\/?a|null|undefined|none|unknown|x+|[-._،؛?]+|\d+)$/i;

/** تشخیص بانک از روی شمارهٔ کارت یا نام بانک */
export const detectBank = (cardNumber?: string, bankName?: string): BankBrand => {
  const digits = toEn(cardNumber ?? '').replace(/\D/g, '');
  if (digits.length >= 6) {
    const brand = IIN_MAP[digits.slice(0, 6)];
    if (brand) return brand;
  }
  if (bankName && !PLACEHOLDER_NAME.test(bankName.trim())) {
    const clean = bankName.trim();
    const byName = BANK_OPTIONS.find(
      (b) => b.name.includes(clean) || clean.includes(b.name.replace('بانک ', '')),
    );
    if (byName) return byName;
    return { ...FALLBACK, key: 'custom', name: clean };
  }
  return FALLBACK;
};

/** آیا بانک واقعاً شناسایی شد یا فقط حالت پیش‌فرض است */
export const isKnownBank = (brand: BankBrand): boolean => brand.key !== 'unknown';

/** اعتبارسنجی شمارهٔ کارت با الگوریتم لان */
export const isValidCardNumber = (cardNumber: string): boolean => {
  const digits = toEn(cardNumber).replace(/\D/g, '');
  if (digits.length !== 16) return false;
  let sum = 0;
  for (let i = 0; i < 16; i += 1) {
    const value = Number(digits[i]) * (i % 2 === 0 ? 2 : 1);
    sum += value > 9 ? value - 9 : value;
  }
  return sum % 10 === 0;
};
