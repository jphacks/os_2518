"use client";

import { Match } from '@/types/domain';

type Props = {
  requests: Match[];
  currentUserId: number;
  onSelect: (match: Match) => void;
};

export function NotificationList({ requests, currentUserId, onSelect }: Props) {
  if (requests.length === 0) {
    return <p className="text-sm text-slate-600">チャット申請待ちはありません。</p>;
  }

  return (
    <ul className="space-y-3">
      {requests.map((match) => {
        const requester = match.requester.id === currentUserId ? match.receiver : match.requester;

        return (
          <li key={match.id}>
            <button
              type="button"
              onClick={() => onSelect(match)}
              className="flex w-full items-center gap-4 rounded-xl bg-[#d9d9d9] px-6 py-4 text-left shadow-sm transition hover:shadow-md"
            >
              <span className="inline-block h-12 w-12 flex-shrink-0 rounded-full bg-red-500" aria-hidden />
              <span className="text-lg font-medium text-slate-900">
                {requester.displayName}さんからチャット申請がとどきました
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
