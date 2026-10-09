import type { Category } from './categories';
import type { SplitMode } from './split';

export interface Room {
  id: string;
  name: string;
  currency: string;
  createdAt: number;
}

export interface Member {
  id: string;
  name: string;
  animal: string;
  ink: number;
  claimed: boolean;
  createdAt: number;
}

export interface Expense {
  id: string;
  kind: 'expense' | 'transfer';
  title: string;
  note: string;
  category: Category;
  amount: number;
  paidBy: string;
  date: string;
  splitMode: SplitMode;
  splits: { memberId: string; value: number; amount: number }[];
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export type ActivityType =
  | 'room_created'
  | 'member_joined'
  | 'member_added'
  | 'member_claimed'
  | 'member_updated'
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'passphrase_rotated';

export interface Activity {
  id: string;
  memberId: string | null;
  type: ActivityType;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface RoomState {
  room: Room;
  members: Member[];
  me: string;
  passphrase: string;
}
