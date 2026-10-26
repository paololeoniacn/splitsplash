import { z } from 'zod';
import { ANIMAL_IDS } from './animals';
import { CATEGORIES } from './categories';
import { CURRENCIES } from './money';

const name = z.string().trim().min(1).max(40);

export const memberInput = z.object({ name, animal: z.enum(ANIMAL_IDS) });

export const createRoomInput = z.object({
  name: z.string().trim().min(1).max(60),
  currency: z.enum(CURRENCIES),
  member: memberInput,
});

export const settleAllInput = z.object({
  title: z.string().trim().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // The plan the client showed; the server only records it if it still matches the current balances.
  transfers: z
    .array(z.object({ from: z.string().min(1), to: z.string().min(1), amount: z.number().int().positive() }))
    .min(1)
    .max(100),
});

export const rotateInput = z.object({ signOutOthers: z.boolean().optional() });

export const lookupInput = z.object({ passphrase: z.string().min(1).max(120) });

export const joinInput = z.union([
  z.object({ passphrase: z.string().min(1).max(120), memberId: z.string().min(1) }),
  z.object({ passphrase: z.string().min(1).max(120), member: memberInput }),
]);

export const expenseInput = z.object({
  kind: z.enum(['expense', 'transfer']),
  title: z.string().trim().min(1).max(80),
  note: z.string().trim().max(500).optional().default(''),
  category: z.enum(CATEGORIES).default('other'),
  amount: z.number().int().positive().max(1_000_000_000_00),
  paidBy: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  split: z.object({
    mode: z.enum(['equal', 'exact', 'shares', 'percent']),
    entries: z
      .array(z.object({ memberId: z.string().min(1), value: z.number().nonnegative() }))
      .min(1)
      .max(100),
  }),
});

export type CreateRoomInput = z.infer<typeof createRoomInput>;
export type JoinInput = z.infer<typeof joinInput>;
export type ExpenseInput = z.input<typeof expenseInput>;
