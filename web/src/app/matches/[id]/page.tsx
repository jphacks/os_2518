"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter, useParams } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { getMatch } from '@/lib/api/matches';
import { listMessages, markMessageAsRead, postMessage } from '@/lib/api/messages';
import type { Match, Message } from '@/types/domain';
import { ApiError } from '@/lib/api/client';

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
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  const counterpart = useMemo(() => {
    if (!user || !match) {
      return null;
    }
    return match.requester.id === user.id ? match.receiver : match.requester;
  }, [match, user]);

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
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 text-sm shadow-sm ${
                      isMine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className="mt-1 text-xs opacity-70">{new Date(message.createdAt).toLocaleString()}</p>
                  </div>
                </div>
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
          <div className="mt-2 flex justify-end">
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
    </div>
  );
}
