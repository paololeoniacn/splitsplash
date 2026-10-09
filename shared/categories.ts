export const CATEGORIES = ['food', 'groceries', 'drinks', 'transport', 'fuel', 'lodging', 'tickets', 'shopping', 'home', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];
