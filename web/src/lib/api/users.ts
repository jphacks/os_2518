import { apiFetch } from '@/lib/api/client';
import { User } from '@/types/domain';

type UsersResponse = {
  users: User[];
  nextCursor: number | null;
};

export async function listUsers(params: Record<string, string | number | boolean | undefined> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  const path = query ? `/users?${query}` : '/users';
  return apiFetch<UsersResponse>(path);
}

export async function getUser(userId: number) {
  return apiFetch<{ user: User }>(`/users/${userId}`);
}
