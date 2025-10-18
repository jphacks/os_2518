import { apiFetch } from '@/lib/api/client';
import { Language } from '@/types/domain';

export async function listLanguages() {
  return apiFetch<{ languages: Language[] }>('/languages');
}
