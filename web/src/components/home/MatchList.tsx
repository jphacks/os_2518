"use client";

import { Match } from '@/types/domain';

type Props = {
  matches: Match[];
  currentUserId: number;
  onOpenChat: (matchId: number) => void;
};

export function MatchList({ matches, currentUserId, onOpenChat }: Props) {
  if (matches.length === 0) {
    return <p className="text-sm text-slate-600">まだマッチングはありません。</p>;
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const other = match.requester.id === currentUserId ? match.receiver : match.requester;
        const latest = match.latestMessage;

        return (
          <article key={match.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100">
                {other.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={other.iconUrl} alt={other.displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    {other.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900">{other.displayName}</h3>
                <p className="mt-1 text-xs text-slate-500">ステータス: {match.status}</p>
                {latest ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{latest.content}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">メッセージはまだありません</p>
                )}
              </div>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
                onClick={() => onOpenChat(match.id)}
              >
                チャットへ
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
