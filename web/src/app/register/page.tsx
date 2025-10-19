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
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyConfirmed, setPolicyConfirmed] = useState(false);
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

  const getTargetError = () => {
    if (targets.length === 0 || targets.some((target) => !target.languageCode)) {
      return '練習したい言語を少なくとも1つ選択してください';
    }
    return null;
  };

  const performRegister = async () => {
    if (submitting || loading) {
      return;
    }
    const targetError = getTargetError();
    if (targetError) {
      setError(targetError);
      return;
    }
    setError(null);
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetError = getTargetError();
    if (targetError) {
      setError(targetError);
      return;
    }
    setError(null);
    if (!policyConfirmed) {
      setShowPolicyModal(true);
      return;
    }
    void performRegister();
  };

  const handleAcceptPolicy = () => {
    const targetError = getTargetError();
    if (targetError) {
      setError(targetError);
      return;
    }
    setError(null);
    setPolicyConfirmed(true);
    setShowPolicyModal(false);
    void performRegister();
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
      {showPolicyModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div
            className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-policy-title"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 id="privacy-policy-title" className="text-lg font-semibold text-slate-900">
                プライバシーポリシー
              </h2>
              <button
                type="button"
                className="text-slate-500 transition hover:text-slate-700"
                onClick={() => setShowPolicyModal(false)}
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div className="h-[60vh] overflow-y-auto px-6 py-4 text-sm text-slate-700">
              <div className="space-y-5">
                <p>
                  Lingua Bridge（以下「本サービス」）は gold apple（以下「当チーム」）が提供する交流マッチングサービスです。以下の方針に基づき、利用者の個人情報を適切に取り扱います。なお、本サービスは現在ベータ版として提供しており、仕様は予告なく変更される可能性があります。
                </p>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">1. 収集する情報</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>必須情報: 表示名、メールアドレス、パスワード、母国語、練習したい言語、習熟度レベル</li>
                    <li>任意情報: 趣味、特技、自己紹介コメント、アイコン画像</li>
                    <li>
                      サービス利用時に生成される情報: マッチング履歴、メッセージ内容、予定（開始・終了時刻・メモ・提案状況）、通知履歴、利用ログ（アクセス日時・IP アドレス・端末情報など）
                    </li>
                    <li>外部サービス連携で取得する情報: DeepL API の翻訳結果、Gmail リマインダー送信履歴</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">2. 情報の利用目的</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>本サービスの提供、本人確認、ログイン・セッション管理</li>
                    <li>プロフィール作成・表示、マッチング・検索機能の提供</li>
                    <li>メッセージ・予定調整機能など交流機能の運用</li>
                    <li>利用状況分析によるサービス改善や新機能開発</li>
                    <li>重要なお知らせ、サポート対応、不正防止・セキュリティ対策</li>
                    <li>法令や利用規約に基づく対応</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">3. 第三者提供・外部委託</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>本人の同意なく第三者に提供することはありません。</li>
                    <li>例外的に法令に基づく要請、生命・財産の保護、事業承継等で提供する場合があります。</li>
                    <li>DeepL API や Google/Gmail など外部サービスに必要最小限の情報を送信し、各社の規約・ポリシーに従います。</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">4. 情報の安全管理</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>パスワードは bcrypt により暗号化して保存します。</li>
                    <li>アクセス権限管理やログ監視など、適切な安全管理措置を講じます。</li>
                    <li>一定期間利用のない情報は削除または匿名化する場合があります。</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">5. 利用者の権利</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>登録情報の閲覧・修正はプロフィール設定から行えます。</li>
                    <li>アカウント削除や利用停止の機能は現時点で提供しておらず、今後のアップデートでの対応を検討しています。</li>
                    <li>本人確認フローは未実装のため、申し出時に追加情報を求める場合があります。</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">6. クッキー等の利用</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>セッション維持や利用状況分析のためにクッキー等を利用することがあります。</li>
                    <li>ブラウザの設定で無効化できますが、一部機能が利用できなくなる可能性があります。</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">7. 未成年の利用</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>16 歳未満の利用は保護者の同意を前提とした自己申告に依存しており、アプリ内で同意を確認する機能はありません。</li>
                    <li>保護者と十分に相談したうえでご利用ください。</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">8. プライバシーポリシーの変更</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>必要に応じて改定し、アプリ内またはウェブサイトで告知します。</li>
                    <li>重要な変更がある場合は、適切な方法で周知します。</li>
                  </ul>
                </div>
                <p>当チームは、本サービスを安心してご利用いただけるよう、上記方針を継続的に見直し、適切に運用します。</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                onClick={() => setShowPolicyModal(false)}
              >
                戻る
              </button>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleAcceptPolicy}
                disabled={loading || submitting}
              >
                同意して登録
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
