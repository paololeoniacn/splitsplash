import { BedDouble, Car, Fuel, Home, Package, ShoppingBag, ShoppingCart, Ticket, UtensilsCrossed, Wine, type LucideIcon } from 'lucide-react';
import type { Category } from '../../shared/categories';

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  food: UtensilsCrossed,
  groceries: ShoppingCart,
  drinks: Wine,
  transport: Car,
  fuel: Fuel,
  lodging: BedDouble,
  tickets: Ticket,
  shopping: ShoppingBag,
  home: Home,
  other: Package,
};
