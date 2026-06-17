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
