import {
  ShoppingCart, Utensils, Car, Home, HeartPulse, GraduationCap, Plane, Gift,
  Wallet, Briefcase, TrendingUp, Zap, Wifi, Clapperboard, Dumbbell, Shirt,
  PiggyBank, Receipt, Landmark, ArrowLeftRight, Sparkles, Baby, PawPrint,
  Fuel, Coffee, BookOpen, Hammer, type LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  /** رنگ پایه به صورت rgb بدون پرانتز، برای استفاده در گرادیان و glow */
  rgb: string;
  kind: 'income' | 'expense' | 'both';
}

export const CATEGORIES: CategoryMeta[] = [
  // هزینه‌ها
  { key: 'groceries', label: 'خواربار', icon: ShoppingCart, rgb: '34 197 94', kind: 'expense' },
  { key: 'food', label: 'رستوران و کافه', icon: Utensils, rgb: '249 115 22', kind: 'expense' },
  { key: 'coffee', label: 'کافی‌شاپ', icon: Coffee, rgb: '180 83 9', kind: 'expense' },
  { key: 'transport', label: 'حمل و نقل', icon: Car, rgb: '59 130 246', kind: 'expense' },
  { key: 'fuel', label: 'سوخت', icon: Fuel, rgb: '100 116 139', kind: 'expense' },
  { key: 'housing', label: 'مسکن و اجاره', icon: Home, rgb: '168 85 247', kind: 'expense' },
  { key: 'bills', label: 'قبوض', icon: Zap, rgb: '234 179 8', kind: 'expense' },
  { key: 'internet', label: 'اینترنت و موبایل', icon: Wifi, rgb: '14 165 233', kind: 'expense' },
  { key: 'health', label: 'سلامت و درمان', icon: HeartPulse, rgb: '244 63 94', kind: 'expense' },
  { key: 'education', label: 'آموزش', icon: GraduationCap, rgb: '99 102 241', kind: 'expense' },
  { key: 'books', label: 'کتاب و نشریه', icon: BookOpen, rgb: '20 184 166', kind: 'expense' },
  { key: 'entertainment', label: 'سرگرمی', icon: Clapperboard, rgb: '217 70 239', kind: 'expense' },
  { key: 'sport', label: 'ورزش', icon: Dumbbell, rgb: '16 185 129', kind: 'expense' },
  { key: 'clothing', label: 'پوشاک', icon: Shirt, rgb: '236 72 153', kind: 'expense' },
  { key: 'travel', label: 'سفر', icon: Plane, rgb: '6 182 212', kind: 'expense' },
  { key: 'gift', label: 'هدیه', icon: Gift, rgb: '251 113 133', kind: 'both' },
  { key: 'family', label: 'خانواده', icon: Baby, rgb: '147 197 253', kind: 'expense' },
  { key: 'pet', label: 'حیوان خانگی', icon: PawPrint, rgb: '161 98 7', kind: 'expense' },
  { key: 'repair', label: 'تعمیرات', icon: Hammer, rgb: '120 113 108', kind: 'expense' },
  { key: 'tax', label: 'مالیات و عوارض', icon: Receipt, rgb: '113 113 122', kind: 'expense' },

  // درآمدها
  { key: 'salary', label: 'حقوق و دستمزد', icon: Briefcase, rgb: '16 185 129', kind: 'income' },
  { key: 'business', label: 'درآمد کسب‌وکار', icon: Landmark, rgb: '52 211 153', kind: 'income' },
  { key: 'investment', label: 'سرمایه‌گذاری', icon: TrendingUp, rgb: '34 211 238', kind: 'income' },
  { key: 'savings', label: 'پس‌انداز', icon: PiggyBank, rgb: '129 140 248', kind: 'both' },
  { key: 'bonus', label: 'پاداش', icon: Sparkles, rgb: '250 204 21', kind: 'income' },

  // انتقال / سایر
  { key: 'transfer', label: 'انتقال بین حساب', icon: ArrowLeftRight, rgb: '148 163 184', kind: 'both' },
  { key: 'other', label: 'سایر', icon: Wallet, rgb: '148 163 184', kind: 'both' },
];

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));
const BY_LABEL = new Map(CATEGORIES.map((c) => [c.label, c]));

export const FALLBACK_CATEGORY = BY_KEY.get('other')!;

/** یافتن دستهٔ متناظر با کلید یا برچسب فارسی */
export const getCategory = (value?: string | null): CategoryMeta => {
  if (!value) return FALLBACK_CATEGORY;
  const clean = value.trim();
  return BY_KEY.get(clean) ?? BY_LABEL.get(clean) ?? { ...FALLBACK_CATEGORY, label: clean };
};

export const expenseCategories = CATEGORIES.filter((c) => c.kind !== 'income');
export const incomeCategories = CATEGORIES.filter((c) => c.kind !== 'expense');
