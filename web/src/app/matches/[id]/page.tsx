"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter, useParams } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { getMatch } from '@/lib/api/matches';
import { listMessages, markMessageAsRead, postMessage } from '@/lib/api/messages';
import {
  createSchedule,
  acceptSchedule as acceptScheduleRequest,
  cancelSchedule as cancelScheduleRequest,
} from '@/lib/api/schedules';
import { translateMessage } from '@/lib/api/translation';
import type { Match, Message } from '@/types/domain';
import { ApiError } from '@/lib/api/client';
import { ScheduleModal } from '@/components/matches/ScheduleModal';
import { ScheduleMessageItem } from '@/components/matches/ScheduleMessageItem';

export default function MatchChatPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const matchId = Number(params.id);
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleActionLoading, setScheduleActionLoading] = useState<'confirm' | 'propose' | null>(null);
  const [scheduleModalError, setScheduleModalError] = useState<string | null>(null);
  const [acceptingScheduleId, setAcceptingScheduleId] = useState<number | null>(null);
  const [cancelingScheduleId, setCancelingScheduleId] = useState<number | null>(null);
  const [translationStates, setTranslationStates] = useState<Record<number, {
    status: 'idle' | 'loading' | 'done' | 'error';
    translation: string | null;
    error: string | null;
    showTranslation: boolean;
  }>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  const counterpart = useMemo(() => {
    if (!user || !match) {
      return null;
    }
    return match.requester.id === user.id ? match.receiver : match.requester;
  }, [match, user]);

  const languageByUserId = useMemo(() => {
    const map = new Map<number, string | null>();
    if (match) {
      map.set(match.requester.id, match.requester.nativeLanguage?.code ?? null);
      map.set(match.receiver.id, match.receiver.nativeLanguage?.code ?? null);
    }
    return map;
  }, [match]);

const userNativeLanguageCode = useMemo(() => user.nativeLanguage?.code ?? null, [user.nativeLanguage?.code]);

  useEffect(() => {
    setTranslationStates({});
  }, [matchId]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!matchId) {
      return;
    }
    try {
      const response = await listMessages(matchId, { limit: 100 });
      const ordered = [...response.messages].reverse();
      setMessages(ordered);

      if (user) {
        const unread = ordered.filter((message) => !message.isRead && message.senderId !== user.id);
        await Promise.all(unread.map((message) => markMessageAsRead(message.id).catch(() => undefined)));
      }
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error(err);
      setError('メッセージの取得に失敗しました');
    }
  }, [matchId, user, scrollToBottom]);

  const handleOpenScheduleModal = useCallback(() => {
    setIsScheduleModalOpen(true);
    setScheduleModalError(null);
  }, []);

  const handleScheduleAction = useCallback(
    async (
      action: 'confirm' | 'propose',
      values: { slots: Array<{ date: string; startTime: string; endTime: string }>; note: string },
    ) => {
      if (!matchId || Number.isNaN(matchId)) {
        setScheduleModalError('マッチング情報が正しくありません');
        return;
      }

      setScheduleModalError(null);
      setScheduleActionLoading(action);
      try {
        const targetSlots = action === 'confirm' ? values.slots.slice(0, 1) : values.slots;
        const slots: Array<{ startTime: string; endTime: string }> = [];

        for (const slot of targetSlots) {
          const start = new Date(`${slot.date}T${slot.startTime}`);
          const end = new Date(`${slot.date}T${slot.endTime}`);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            setScheduleModalError('日付と時間を正しく入力してください');
            return;
          }
          if (end <= start) {
            setScheduleModalError('終了時間は開始時間より後に設定してください');
            return;
          }
          slots.push({
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          });
        }

        await createSchedule(matchId, {
          action,
          slots,
          note: values.note.trim() ? values.note.trim() : undefined,
        });
        setIsScheduleModalOpen(false);
        await loadMessages();
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError) {
          setScheduleModalError(err.message);
        } else {
          setScheduleModalError('予定の追加に失敗しました');
        }
      } finally {
        setScheduleActionLoading(null);
      }
    },
    [matchId, loadMessages],
  );

  const handleAcceptSchedule = useCallback(
    async (scheduleId: number) => {
      setAcceptingScheduleId(scheduleId);
      try {
        await acceptScheduleRequest(scheduleId);
        await loadMessages();
      } catch (err) {
        console.error(err);
        setError('予定の登録に失敗しました');
      } finally {
        setAcceptingScheduleId(null);
      }
    },
    [loadMessages],
  );

  const handleCancelSchedule = useCallback(
    async (scheduleId: number) => {
      setCancelingScheduleId(scheduleId);
      try {
        await cancelScheduleRequest(scheduleId);
        await loadMessages();
      } catch (err) {
        console.error(err);
        setError('予定の破棄に失敗しました');
      } finally {
        setCancelingScheduleId(null);
      }
    },
    [loadMessages],
  );

  const handleNavigateToCalendar = useCallback(() => {
    router.push('/home?tab=calendar');
  }, [router]);

  const handleToggleTranslation = useCallback(
    async (message: Message) => {
      if (message.senderId === user.id) {
        return;
      }

      const targetLang = userNativeLanguageCode;
      if (!targetLang) {
        setTranslationStates((prev) => ({
          ...prev,
          [message.id]: {
            status: 'error',
            translation: null,
            error: '翻訳先の言語が設定されていません。プロフィールを確認してください。',
            showTranslation: false,
          },
        }));
        return;
      }

      const current = translationStates[message.id];

      if (current?.status === 'loading') {
        return;
      }

      if (current?.showTranslation) {
        setTranslationStates((prev) => ({
          ...prev,
          [message.id]: {
            ...current,
            showTranslation: false,
          },
        }));
        return;
      }

      if (current?.status === 'done' && current.translation) {
        setTranslationStates((prev) => ({
          ...prev,
          [message.id]: {
            ...current,
            showTranslation: true,
          },
        }));
        return;
      }

      setTranslationStates((prev) => ({
        ...prev,
        [message.id]: {
          status: 'loading',
          translation: current?.translation ?? null,
          error: null,
          showTranslation: false,
        },
      }));

      try {
        const sourceLang = languageByUserId.get(message.senderId) ?? undefined;
        const response = await translateMessage({ text: message.content, sourceLang, targetLang });
        setTranslationStates((prev) => ({
          ...prev,
          [message.id]: {
            status: 'done',
            translation: response.translation,
            error: null,
            showTranslation: true,
          },
        }));
      } catch (err) {
        console.error('Translation request failed', err);
        setTranslationStates((prev) => ({
          ...prev,
          [message.id]: {
            status: 'error',
            translation: null,
            error: err instanceof Error ? err.message : '翻訳に失敗しました',
            showTranslation: false,
          },
        }));
      }
    },
    [languageByUserId, user.id, userNativeLanguageCode],
  );

  const loadMatchDetail = useCallback(async () => {
    try {
      const response = await getMatch(matchId);
      setMatch(response.match);
    } catch (err) {
      console.error(err);
      setError('マッチング情報の取得に失敗しました');
    }
  }, [matchId]);

  useEffect(() => {
    if (!matchId || Number.isNaN(matchId)) {
      setError('マッチングIDが不正です');
      return;
    }

    (async () => {
      setLoading(true);
      await Promise.all([loadMatchDetail(), loadMessages()]);
      setLoading(false);
    })();
  }, [matchId, loadMatchDetail, loadMessages]);

  useEffect(() => {
    if (!matchId) {
      return undefined;
    }

    const eventSource = new EventSource('/api/v1/events/stream', { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          event: string;
          data: {
            matchId?: number;
            [key: string]: unknown;
          };
        };
        if (payload.data?.matchId !== matchId) {
          return;
        }
        if (payload.event === 'message.created' || payload.event === 'message.read') {
          loadMessages();
        }
        if (payload.event === 'message.updated') {
          loadMessages();
        }
        if (payload.event === 'schedule.changed' && payload.data?.matchId === matchId) {
          loadMessages();
        }
      } catch (err) {
        console.error(err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [matchId, loadMessages]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const previousY = lastScrollY.current;
      if (currentY > previousY && currentY > 80) {
        setHeaderHidden(true);
      } else if (currentY < previousY - 10) {
        setHeaderHidden(false);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      await postMessage(matchId, { content: newMessage.trim() });
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('メッセージの送信に失敗しました');
      }
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header
        className={`fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur transition-transform duration-300 ${
          headerHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => router.push('/home')}>
            ← ホームに戻る
          </button>
          <div className="text-right">
            <h1 className="text-lg font-semibold text-slate-900">チャット</h1>
            {counterpart ? <p className="text-sm text-slate-600">{counterpart.displayName} さんとの会話</p> : null}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-6 pt-24">
        {loading ? <p className="text-sm text-slate-600">読み込み中...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const isMine = message.senderId === user.id;
              if (message.type === 'TEXT') {
                const translationState = translationStates[message.id];
                const showTranslation = translationState?.showTranslation && translationState.status === 'done';
                const displayedText = showTranslation ? translationState.translation ?? message.content : message.content;
                const buttonLabel = translationState?.status === 'loading'
                  ? '翻訳中...'
                  : showTranslation
                    ? '原文を表示'
                    : translationState?.status === 'done'
                      ? '翻訳結果を表示'
                      : 'メッセージを翻訳する';

                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 text-sm shadow-sm ${
                        isMine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <p>{displayedText}</p>
                      <p className="mt-1 text-xs opacity-70">{new Date(message.createdAt).toLocaleString()}</p>
                      {!isMine ? (
                        <div className="mt-2 space-y-1">
                          <button
                            type="button"
                            className={`text-[11px] ${isMine ? 'text-blue-100' : 'text-blue-600'} underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-blue-300`}
                            onClick={() => void handleToggleTranslation(message)}
                            disabled={translationState?.status === 'loading'}
                          >
                            {buttonLabel}
                          </button>
                          {translationState?.status === 'error' && translationState.error ? (
                            <p className="text-xs text-red-500">{translationState.error}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }

              return (
                <ScheduleMessageItem
                  key={message.id}
                  message={message}
                  isMine={isMine}
                  currentUserId={user.id}
                  onAccept={handleAcceptSchedule}
                  onCancel={handleCancelSchedule}
                  acceptingScheduleId={acceptingScheduleId}
                  cancelingScheduleId={cancelingScheduleId}
                  onNavigateToCalendar={handleNavigateToCalendar}
                />
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <textarea
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder="メッセージを入力..."
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={handleOpenScheduleModal}
            >
              <span role="img" aria-hidden="true">
                📅
              </span>
              <span>予定追加</span>
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? '送信中...' : '送信'}
            </button>
          </div>
        </div>
      </main>
      <ScheduleModal
        open={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setScheduleActionLoading(null);
          setScheduleModalError(null);
        }}
        onAction={handleScheduleAction}
        loadingAction={scheduleActionLoading}
        errorMessage={scheduleModalError}
      />
    </div>
  );
}
