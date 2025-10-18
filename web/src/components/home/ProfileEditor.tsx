"use client";

import { FormEvent, useState } from 'react';

import { Language, TargetLanguage, User } from '@/types/domain';

type Props = {
  user: User;
  languages: Language[];
  onUpdateProfile: (payload: Partial<{ displayName: string; nativeLanguageCode: string; hobby: string | null; skill: string | null; comment: string | null }>) => Promise<void>;
  onUploadIcon: (file: File) => Promise<void>;
  onAddTargetLanguage: (payload: { languageCode: string; level: number }) => Promise<void>;
  onRemoveTargetLanguage: (targetId: number) => Promise<void>;
};

export function ProfileEditor({ user, languages, onUpdateProfile, onUploadIcon, onAddTargetLanguage, onRemoveTargetLanguage }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [hobby, setHobby] = useState(user.hobby ?? '');
  const [skill, setSkill] = useState(user.skill ?? '');
  const [comment, setComment] = useState(user.comment ?? '');
  const [nativeLanguageCode, setNativeLanguageCode] = useState(user.nativeLanguage?.code ?? languages[0]?.code ?? '');
  const [newTarget, setNewTarget] = useState({ languageCode: languages[0]?.code ?? '', level: 3 });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onUpdateProfile({
        displayName,
        hobby,
        skill,
        comment,
        nativeLanguageCode,
      });
    } catch (err) {
      console.error(err);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleIconChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploading(true);
    try {
      await onUploadIcon(file);
    } catch (err) {
      console.error(err);
      setError('アイコンのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTarget = async () => {
    setError(null);
    try {
      await onAddTargetLanguage(newTarget);
    } catch (err) {
      console.error(err);
      setError('ターゲット言語の追加に失敗しました');
    }
  };

  const handleRemoveTarget = async (target: TargetLanguage) => {
    setError(null);
    try {
      await onRemoveTargetLanguage(target.id);
    } catch (err) {
      console.error(err);
      setError('ターゲット言語の削除に失敗しました');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">プロフィール情報</h2>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-100">
            {user.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.iconUrl} alt="プロフィールアイコン" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                {user.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <label className="text-sm font-medium text-blue-600">
            <span className="cursor-pointer">アイコンを変更</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} disabled={isUploading} />
          </label>
          {isUploading ? <span className="text-xs text-slate-500">アップロード中...</span> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">表示名</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">母国語</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={nativeLanguageCode}
              onChange={(event) => setNativeLanguageCode(event.target.value)}
            >
              {languages.map((language) => (
                <option key={language.id} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">趣味</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={hobby}
              onChange={(event) => setHobby(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">特技</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={skill}
              onChange={(event) => setSkill(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">ひとこと</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? '保存中...' : '保存する'}
        </button>
      </form>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">練習中の言語</h2>
        <ul className="space-y-2">
          {user.targetLanguages.map((target) => (
            <li key={target.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
              <span>
                {target.language?.name ?? '未設定'} / レベル {target.level}
              </span>
              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => handleRemoveTarget(target)}>
                削除
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 md:flex-row">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={newTarget.languageCode}
            onChange={(event) => setNewTarget((prev) => ({ ...prev, languageCode: event.target.value }))}
          >
            {languages.map((language) => (
              <option key={language.id} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={newTarget.level}
            onChange={(event) => setNewTarget((prev) => ({ ...prev, level: Number(event.target.value) }))}
          >
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                レベル {level}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            onClick={handleAddTarget}
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
