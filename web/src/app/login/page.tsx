"use client";

import { FormEvent, useState } from 'react';

import { useRouter } from 'next/navigation';

import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form);
      router.replace('/home');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('予期しないエラーが発生しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950/5 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-md">
        <h1 className="text-2xl font-semibold text-slate-900">ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">アカウントにサインインして交流を始めましょう。</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '処理中...' : 'ログイン'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-600">
          アカウントをお持ちでない方は{' '}
          <button
            type="button"
            className="font-medium text-blue-600 hover:underline"
            onClick={() => router.push('/register')}
          >
            新規登録
          </button>
        </div>
      </div>
    </div>
  );
}
