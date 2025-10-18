import { apiFetch } from '@/lib/api/client';
import { Notification } from '@/types/domain';

type NotificationsResponse = {
  notifications: Notification[];
  nextCursor: number | null;
};

export async function listNotifications(params: Record<string, string | number | boolean | undefined> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  const path = query ? `/notifications?${query}` : '/notifications';
  return apiFetch<NotificationsResponse>(path);
}

export async function markNotificationRead(notificationId: number) {
  return apiFetch<{ notification: Notification }>(`/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}
