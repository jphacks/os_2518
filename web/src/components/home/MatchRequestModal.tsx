"use client";

import { Match } from '@/types/domain';

type Props = {
  open: boolean;
  match: Match | null;
  currentUserId: number;
  onApprove: (match: Match) => Promise<void>;
  onReject: (match: Match) => Promise<void>;
  onClose: () => void;
};

export function MatchRequestModal({ open, match, currentUserId, onApprove, onReject, onClose }: Props) {
  if (!open || !match) {
    return null;
  }

  const requester = match.requester.id === currentUserId ? match.receiver : match.requester;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#d9d9d9] p-8 shadow-2xl">
        <div className="flex flex-col gap-4 text-slate-900">
          <div className="flex items-start gap-4">
            <span className="inline-block h-20 w-20 flex-shrink-0 rounded-full bg-red-500" aria-hidden />
            <div className="space-y-1 text-lg font-medium">
              <p>名前：{requester.displayName}</p>
              <p>母国語：{requester.nativeLanguage?.name ?? '未設定'}</p>
            </div>
          </div>

          <div className="space-y-2 text-base">
            <p className="font-semibold">練習したい言語：</p>
            <ul className="ml-4 list-disc space-y-1">
              {requester.targetLanguages.length > 0 ? (
                requester.targetLanguages.map((target) => (
                  <li key={target.id}>
                    {target.language?.name ?? '未設定'}（レベル {target.level}）
                  </li>
                ))
              ) : (
                <li>未設定</li>
              )}
            </ul>
            <p>趣味：{requester.hobby ?? '未設定'}</p>
            <p>特技：{requester.skill ?? '未設定'}</p>
            <p>一言：{requester.comment ?? '未設定'}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="w-full rounded-md bg-cyan-300 px-6 py-3 text-center text-base font-semibold text-slate-900 transition hover:bg-cyan-200 sm:w-48"
            onClick={() => void onApprove(match)}
          >
            申請を承認
          </button>
          <button
            type="button"
            className="w-full rounded-md bg-cyan-300 px-6 py-3 text-center text-base font-semibold text-slate-900 transition hover:bg-cyan-200 sm:w-48"
            onClick={() => void onReject(match)}
          >
            申請を拒否
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-slate-400 px-6 py-3 text-center text-base font-semibold text-slate-700 transition hover:bg-slate-200 sm:w-48"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
