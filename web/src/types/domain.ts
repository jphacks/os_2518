export type Language = {
  id: number;
  code: string;
  name: string;
};

export type TargetLanguage = {
  id: number;
  level: number;
  language: Language | null;
};

export type User = {
  id: number;
  displayName: string;
  email: string;
  nativeLanguage: Language | null;
  hobby?: string | null;
  skill?: string | null;
  comment?: string | null;
  iconPath?: string | null;
  iconUrl?: string | null;
  targetLanguages: TargetLanguage[];
};

export type Notification = {
  id: number;
  type: string;
  payload: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type Message = {
  id: number;
  matchId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Match = {
  id: number;
  status: string;
  requester: User;
  receiver: User;
  latestMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedResponse<T> = {
  data: T;
  nextCursor: number | null;
};
