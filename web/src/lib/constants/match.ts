export const MATCH_STATUS = {
  PENDING: 1,
  ACCEPTED: 2,
  REJECTED: 3,
} as const;

export type MatchStatusCode = keyof typeof MATCH_STATUS;
