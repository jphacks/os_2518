import { apiFetch } from '@/lib/api/client';
import { User } from '@/types/domain';

export async function updateProfile(payload: Partial<{ displayName: string; nativeLanguageCode: string; hobby: string | null; skill: string | null; comment: string | null }>) {
  return apiFetch<{ user: User }>('/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function uploadIcon(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch<{ user: User }>('/me/icon', {
    method: 'POST',
    body: formData,
  });
}

export async function addTargetLanguage(payload: { languageCode: string; level: number }) {
  return apiFetch<{ user: User }>('/me/targets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeTargetLanguage(targetId: number) {
  return apiFetch<void>(`/me/targets/${targetId}`, {
    method: 'DELETE',
    parseJson: false,
  });
}
