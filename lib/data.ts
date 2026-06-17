// Shared UI types used across the dashboard
export interface MenuVariant {
  label: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  img: string | null;
  category: string;
  variantType?: string;
  variants?: MenuVariant[];
}

export type ExpenseCategory =
  | 'Utilities' | 'Rent' | 'Salaries' | 'Maintenance' | 'Marketing'
  | 'Supplies' | 'Food & Beverage' | 'Transport' | 'Other';

export const CATEGORIES: { label: ExpenseCategory; icon: string; color: string; backend: string }[] = [
  { label: 'Utilities',       icon: '💡', color: '#FBBF24',        backend: 'electricity' },
  { label: 'Rent',            icon: '🏢', color: '#60A5FA',        backend: 'rent' },
  { label: 'Salaries',        icon: '👥', color: '#A78BFA',        backend: 'salary' },
  { label: 'Maintenance',     icon: '🔧', color: '#FF8C42',        backend: 'maintenance' },
  { label: 'Marketing',       icon: '📣', color: '#E13737',        backend: 'marketing' },
  { label: 'Supplies',        icon: '📦', color: '#22C55E',        backend: 'supplies' },
  { label: 'Food & Beverage', icon: '🍽️', color: '#E8443A',        backend: 'food_beverage' },
  { label: 'Transport',       icon: '🚗', color: '#06B6D4',        backend: 'transport' },
  { label: 'Other',           icon: '📋', color: '#888880',        backend: 'other' },
];
