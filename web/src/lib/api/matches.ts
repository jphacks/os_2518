import { apiFetch } from '@/lib/api/client';
import { Match } from '@/types/domain';

type MatchesResponse = {
  matches: Match[];
  nextCursor: number | null;
};

export async function listMatches(params: Record<string, string | number | boolean | undefined> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  const path = query ? `/matches?${query}` : '/matches';
  return apiFetch<MatchesResponse>(path);
}

export async function createMatch(payload: { receiverId: number; message?: string }) {
  return apiFetch<{ match: Match }>('/matches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function acceptMatch(matchId: number) {
  return apiFetch<{ match: Match }>(`/matches/${matchId}/accept`, {
    method: 'POST',
  });
}

export async function rejectMatch(matchId: number) {
  return apiFetch<{ match: Match }>(`/matches/${matchId}/reject`, {
    method: 'POST',
  });
}

export async function getMatch(matchId: number) {
  return apiFetch<{ match: Match }>(`/matches/${matchId}`);
}
