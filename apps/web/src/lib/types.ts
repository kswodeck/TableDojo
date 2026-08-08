import type { Card, DieValue, HandRank, RollCategory } from '@tabledojo/game-logic';

export const AVATARS = ['smiley', 'smiley-money', 'smiley-neutral', 'male-avatar', 'female-avatar'] as const;
export type Avatar = (typeof AVATARS)[number];

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthday: string | null;
  phone: string;
  coins: number;
  highestWin: number;
  loginStreak: number;
  profileImage: Avatar;
  createdAt: string;
}

export interface LoginBonus {
  coins: number;
  streak: number;
}

export interface AuthResponse {
  user: User;
  bonus: LoginBonus | null;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  coins: number;
  highestWin: number;
  profileImage: Avatar;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
}

export interface Board {
  slug: string;
  name: string;
  description: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

export interface Post {
  id: string;
  board: string;
  authorId: string;
  authorUsername: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  commentCount: number;
  comments?: Comment[];
}

/* --- Competitive game payloads ------------------------------------------- */

export interface PokerDealResponse {
  sessionId: string;
  hand: Card[];
  bet: number;
  coins: number;
  preview: HandRank;
}

export interface PokerDrawResponse {
  hand: Card[];
  result: HandRank;
  payout: number;
  bet: number;
  coins: number;
}

export interface BlackjackHandView {
  cards: Card[];
  bet: number;
  status: 'active' | 'stood' | 'busted' | 'blackjack';
  doubled: boolean;
  fromSplitAce: boolean;
  value: { total: number; soft: boolean; busted: boolean };
  outcome?: 'blackjack' | 'win' | 'push' | 'lose';
  payout?: number;
}

export interface BlackjackView {
  sessionId: string;
  status: 'player-turn' | 'dealer-turn' | 'settled';
  hands: BlackjackHandView[];
  activeHandIndex: number;
  dealer: Card[];
  dealerValue: { total: number; soft: boolean; busted: boolean };
  dealerHoleCardHidden: boolean;
  availableActions: ('hit' | 'stand' | 'double' | 'split')[];
  totalPayout: number;
  coins: number;
}

export interface FarkleView {
  sessionId: string;
  bet: number;
  diceAvailable: number;
  rolled: DieValue[];
  category: RollCategory | null;
  pendingPoints: number;
  keeps: { dice: DieValue[]; points: number }[];
  status: 'awaiting-roll' | 'awaiting-keep' | 'farkled' | 'banked';
  hotDice: boolean;
  coins: number;
  payout?: number;
}
