"use client";

import { FormEvent, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ApiError } from '@/lib/api/client';
import { listLanguages } from '@/lib/api/languages';
import { useAuth } from '@/context/AuthContext';
import { Language } from '@/types/domain';

type TargetLanguageForm = {
  languageCode: string;
  level: number;
};

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5];

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    nativeLanguageCode: '',
    hobby: '',
    skill: '',
    comment: '',
  });
  const [targets, setTargets] = useState<TargetLanguageForm[]>([{ languageCode: '', level: 3 }]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await listLanguages();
        if (!active) {
          return;
        }
        setLanguages(response.languages);
        if (response.languages.length > 0) {
          setForm((prev) => ({ ...prev, nativeLanguageCode: prev.nativeLanguageCode || response.languages[0].code }));
          setTargets((prev) => prev.map((item, index) => ({ ...item, languageCode: item.languageCode || response.languages[Math.min(index, response.languages.length - 1)].code })));
        }
      } catch (err) {
        console.error(err);
        setError('言語リストの取得に失敗しました');
      } finally {
        if (active) {
          setLoadingLanguages(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleAddTarget = () => {
    const defaultCode = languages[0]?.code ?? '';
    setTargets((prev) => [...prev, { languageCode: defaultCode, level: 3 }]);
  };

  const handleRemoveTarget = (index: number) => {
    setTargets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (targets.length === 0 || targets.some((target) => !target.languageCode)) {
      setError('練習したい言語を少なくとも1つ選択してください');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        nativeLanguageCode: form.nativeLanguageCode,
        targetLanguages: targets,
        hobby: form.hobby || undefined,
        skill: form.skill || undefined,
        comment: form.comment || undefined,
      });
      router.replace('/home');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('登録に失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950/5 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-md">
        <h1 className="text-2xl font-semibold text-slate-900">新規登録</h1>
        <p className="mt-2 text-sm text-slate-600">プロフィールを作成して交流を始めましょう。</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">表示名</label>
              <input
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.displayName}
                onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">メールアドレス</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">パスワード</label>
              <input
                type="password"
                required
                minLength={8}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">母国語</label>
              <select
                required
                disabled={loadingLanguages}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.nativeLanguageCode}
                onChange={(event) => setForm((prev) => ({ ...prev, nativeLanguageCode: event.target.value }))}
              >
                {languages.map((language) => (
                  <option key={language.id} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-700">練習したい言語</h2>
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:underline"
                onClick={handleAddTarget}
              >
                + 追加
              </button>
            </div>
            <div className="space-y-3">
              {targets.map((target, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <select
                    required
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={target.languageCode}
                    onChange={(event) =>
                      setTargets((prev) => prev.map((item, idx) => (idx === index ? { ...item, languageCode: event.target.value } : item)))
                    }
                  >
                    {languages.map((language) => (
                      <option key={language.id} value={language.code}>
                        {language.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={target.level}
                    onChange={(event) =>
                      setTargets((prev) => prev.map((item, idx) => (idx === index ? { ...item, level: Number(event.target.value) } : item)))
                    }
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        レベル {level}
                      </option>
                    ))}
                  </select>
                  {targets.length > 1 ? (
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => handleRemoveTarget(index)}
                    >
                      削除
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">趣味 (任意)</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.hobby}
                onChange={(event) => setForm((prev) => ({ ...prev, hobby: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">特技 (任意)</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.skill}
                onChange={(event) => setForm((prev) => ({ ...prev, skill: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">ひとこと (任意)</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.comment}
                onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '登録中...' : '登録する'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-600">
          すでにアカウントをお持ちの方は{' '}
          <button
            type="button"
            className="font-medium text-blue-600 hover:underline"
            onClick={() => router.push('/login')}
          >
            ログイン
          </button>
        </div>
      </div>
    </div>
  );
}
