import { apiFetch } from '@/lib/api/client';
import { Message } from '@/types/domain';

type MessagesResponse = {
  messages: Message[];
  nextCursor: number | null;
};

export async function listMessages(matchId: number, params: Record<string, string | number | boolean | undefined> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  const path = query ? `/matches/${matchId}/messages?${query}` : `/matches/${matchId}/messages`;
  return apiFetch<MessagesResponse>(path);
}

export async function postMessage(matchId: number, payload: { content: string }) {
  return apiFetch<{ message: Message }>(`/matches/${matchId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function markMessageAsRead(messageId: number) {
  return apiFetch<{ message: Message }>(`/messages/${messageId}/read`, {
    method: 'POST',
  });
}
