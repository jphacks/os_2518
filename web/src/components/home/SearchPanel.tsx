"use client";

import { FormEvent, useState } from 'react';

import { RecommendedList } from '@/components/home/RecommendedList';
import { Language, User } from '@/types/domain';

type SearchFormState = {
  displayName: string;
  nativeLanguageCode: string;
  targetLanguageCode: string;
  targetLevelGte: number;
};

export type SearchCriteria = Partial<{
  displayName: string;
  nativeLanguageCode: string;
  targetLanguageCode: string;
  targetLevelGte: number;
}>;

type Props = {
  languages: Language[];
  results: User[];
  onSearch: (criteria: SearchCriteria) => Promise<void>;
  onSendMatch: (userId: number) => Promise<void>;
  sendingTo?: number | null;
  loading?: boolean;
  acceptedMatchMap?: Map<number, number>;
  pendingUserIds?: Set<number>;
  unavailableUserIds?: Set<number>;
};

export function SearchPanel({
  languages,
  results,
  onSearch,
  onSendMatch,
  sendingTo,
  loading,
  acceptedMatchMap,
  pendingUserIds,
  unavailableUserIds,
}: Props) {
  const [form, setForm] = useState<SearchFormState>({
    displayName: '',
    nativeLanguageCode: '',
    targetLanguageCode: '',
    targetLevelGte: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    await onSearch({
      displayName: form.displayName || undefined,
      nativeLanguageCode: form.nativeLanguageCode || undefined,
      targetLanguageCode: form.targetLanguageCode || undefined,
      targetLevelGte: form.targetLevelGte ?? undefined,
    });
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">表示名で検索</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">母国語</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.nativeLanguageCode}
              onChange={(event) => setForm((prev) => ({ ...prev, nativeLanguageCode: event.target.value }))}
            >
              <option value="">すべて</option>
              {languages.map((language) => (
                <option key={language.id} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">練習したい言語</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.targetLanguageCode}
              onChange={(event) => setForm((prev) => ({ ...prev, targetLanguageCode: event.target.value }))}
            >
              <option value="">すべて</option>
              {languages.map((language) => (
                <option key={language.id} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">レベル下限</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.targetLevelGte}
              onChange={(event) => setForm((prev) => ({ ...prev, targetLevelGte: Number(event.target.value) }))}
            >
              {[0, 1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  レベル {level} 以上
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '検索中...' : '検索する'}
        </button>
      </form>

      <RecommendedList
        users={results}
        onSendMatch={onSendMatch}
        sendingTo={sendingTo}
        emptyMessage="検索結果はありません。"
        acceptedMatchMap={acceptedMatchMap}
        pendingUserIds={pendingUserIds}
        unavailableUserIds={unavailableUserIds}
      />
    </div>
  );
}
