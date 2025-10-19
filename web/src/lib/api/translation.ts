import { apiFetch } from '@/lib/api/client';

export async function translateMessage(payload: { text: string; sourceLang?: string | null; targetLang: string }) {
  return apiFetch<{ translation: string }>('/translate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
