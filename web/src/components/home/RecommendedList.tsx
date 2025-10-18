"use client";

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { User } from '@/types/domain';

type Props = {
  users: User[];
  onSendMatch: (userId: number) => Promise<void>;
  sendingTo?: number | null;
  emptyMessage?: string;
  acceptedMatchMap?: Map<number, number>;
  pendingUserIds?: Set<number>;
};

export function RecommendedList({
  users,
  onSendMatch,
  sendingTo,
  emptyMessage,
  acceptedMatchMap,
  pendingUserIds,
}: Props) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  if (users.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage ?? '条件に合うおすすめユーザーが見つかりませんでした。'}</p>;
  }

  const closeModal = () => {
    setSelectedUser(null);
  };

  const handlePrimaryAction = async () => {
    if (!selectedUser) {
      return;
    }

    const acceptedMatchId = acceptedMatchMap?.get(selectedUser.id) ?? null;
    if (acceptedMatchId) {
      router.push(`/matches/${acceptedMatchId}`);
      closeModal();
      return;
    }

    if (pendingUserIds?.has(selectedUser.id) || sendingTo === selectedUser.id) {
      return;
    }

    await onSendMatch(selectedUser.id);
    closeModal();
  };

  const isSendingSelected = selectedUser ? sendingTo === selectedUser.id : false;
  const acceptedMatchId = selectedUser ? acceptedMatchMap?.get(selectedUser.id) ?? null : null;
  const isPendingSelected = selectedUser ? pendingUserIds?.has(selectedUser.id) ?? false : false;
  const isDisabled = !acceptedMatchId && (isPendingSelected || isSendingSelected);
  const buttonLabel = acceptedMatchId
    ? 'チャットへ移動'
    : isPendingSelected
      ? '承認待ち'
      : isSendingSelected
        ? '送信中...'
        : 'チャット申請';
  const baseButtonClasses = 'w-full rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed';
  const buttonClasses = acceptedMatchId
    ? `${baseButtonClasses} bg-blue-600 text-white hover:bg-blue-500`
    : isDisabled
      ? `${baseButtonClasses} bg-slate-300 text-slate-600`
      : `${baseButtonClasses} bg-blue-600 text-white hover:bg-blue-500`;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            onClick={() => setSelectedUser(user)}
          >
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
          </button>
        ))}
      </div>

      {selectedUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="relative w-full max-w-xl rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-2xl text-slate-500 hover:text-slate-700"
              onClick={closeModal}
              aria-label="閉じる"
            >
              &times;
            </button>

            <div className="flex items-start gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-100">
                {selectedUser.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedUser.iconUrl}
                    alt={`${selectedUser.displayName}のアイコン`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-500">
                    {selectedUser.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="space-y-1 text-base">
                <p className="font-semibold text-slate-900">{selectedUser.displayName}</p>
                <p className="text-slate-600">母国語: {selectedUser.nativeLanguage?.name ?? '未設定'}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">練習したい言語</p>
                <ul className="mt-2 space-y-1">
                  {selectedUser.targetLanguages.length > 0 ? (
                    selectedUser.targetLanguages.map((target) => (
                      <li key={target.id}>
                        {target.language?.name ?? '未設定'}: レベル {target.level}
                      </li>
                    ))
                  ) : (
                    <li>未設定</li>
                  )}
                </ul>
              </div>
              <p>趣味: {selectedUser.hobby ?? '未設定'}</p>
              <p>特技: {selectedUser.skill ?? '未設定'}</p>
              <p>一言: {selectedUser.comment ?? '未設定'}</p>
            </div>

            <div className="mt-8">
              <button
                type="button"
                className={buttonClasses}
                onClick={() => void handlePrimaryAction()}
                disabled={isDisabled}
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
