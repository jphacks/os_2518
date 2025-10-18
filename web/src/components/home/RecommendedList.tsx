"use client";

import { User } from '@/types/domain';

type Props = {
  users: User[];
  onSendMatch: (userId: number) => Promise<void>;
  sendingTo?: number | null;
};

export function RecommendedList({ users, onSendMatch, sendingTo }: Props) {
  if (users.length === 0) {
    return <p className="text-sm text-slate-600">条件に合うおすすめユーザーが見つかりませんでした。</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {users.map((user) => (
        <article key={user.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100">
              {user.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.iconUrl} alt={`${user.displayName}のアイコン`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-base font-semibold text-slate-900">{user.displayName}</h3>
              <p className="text-sm text-slate-600">母国語: {user.nativeLanguage?.name ?? '未設定'}</p>
              <p className="text-sm text-slate-600">趣味: {user.hobby ?? '未設定'}</p>
              <p className="text-sm text-slate-600">ひとこと: {user.comment ?? '未設定'}</p>
              <div className="text-xs text-slate-500">
                練習中:
                <ul className="mt-1 space-y-0.5">
                  {user.targetLanguages.map((target) => (
                    <li key={target.id}>{target.language?.name ?? '未設定'} / レベル {target.level}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => onSendMatch(user.id)}
              disabled={sendingTo === user.id}
            >
              {sendingTo === user.id ? '送信中...' : 'マッチングを送る'}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
