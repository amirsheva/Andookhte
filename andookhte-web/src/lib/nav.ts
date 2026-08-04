import {
  LayoutDashboard, CreditCard, ArrowLeftRight, PieChart, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** رنگ نشانگر به صورت «r g b» */
  rgb: string;
  soon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard, rgb: '51 100 255' },
  { to: '/accounts', label: 'حساب‌ها', icon: CreditCard, rgb: '168 85 247' },
  { to: '/transactions', label: 'تراکنش‌ها', icon: ArrowLeftRight, rgb: '16 185 129' },
  { to: '/analytics', label: 'تحلیل', icon: PieChart, rgb: '245 158 11' },
];

export const findNavItem = (path: string): NavItem | undefined =>
  NAV_ITEMS.find((item) => (item.to === '/' ? path === '/' : path.startsWith(item.to)));
