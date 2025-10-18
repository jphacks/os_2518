"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { listMatches, createMatch, acceptMatch, rejectMatch } from '@/lib/api/matches';
import { listLanguages } from '@/lib/api/languages';
import { listUsers } from '@/lib/api/users';
import { addTargetLanguage, removeTargetLanguage, updateProfile, uploadIcon } from '@/lib/api/profile';
import { getCurrentUser } from '@/lib/api/auth';
import { RecommendedList } from '@/components/home/RecommendedList';
import { MatchList } from '@/components/home/MatchList';
import { NotificationList } from '@/components/home/NotificationList';
import { ProfileEditor } from '@/components/home/ProfileEditor';
import { SearchPanel } from '@/components/home/SearchPanel';
import { MatchRequestModal } from '@/components/home/MatchRequestModal';
import { ApiError } from '@/lib/api/client';
import type { Language, Match, User } from '@/types/domain';

type TabKey = 'recommended' | 'contacts' | 'search' | 'profile' | 'notifications';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'recommended', label: 'おすすめ' },
  { key: 'contacts', label: '連絡済み' },
  { key: 'search', label: '検索' },
  { key: 'profile', label: 'プロフィール' },
  { key: 'notifications', label: '通知' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading, logout, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('recommended');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const loadLanguages = useCallback(async () => {
    try {
      const response = await listLanguages();
      setLanguages(response.languages);
    } catch (err) {
      console.error(err);
      setError('言語リストの取得に失敗しました');
    }
  }, []);

  const loadRecommended = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const response = await listUsers({ mode: 'recommended', limit: 20 });
      setRecommendedUsers(response.users);
    } catch (err) {
      console.error(err);
      setError('おすすめユーザーの取得に失敗しました');
    }
  }, [user]);

  const loadAcceptedMatches = useCallback(async () => {
    try {
      const response = await listMatches({ status: 'ACCEPTED', limit: 50 });
      setMatches(response.matches);
    } catch (err) {
      console.error(err);
      setError('マッチング情報の取得に失敗しました');
    }
  }, []);

  const loadPendingMatches = useCallback(async () => {
    try {
      const response = await listMatches({ status: 'PENDING', limit: 50 });
      setPendingMatches(response.matches);
    } catch (err) {
      console.error(err);
      setError('チャット申請の取得に失敗しました');
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    loadLanguages();
    loadRecommended();
    loadAcceptedMatches();
    loadPendingMatches();
  }, [user, loadLanguages, loadRecommended, loadAcceptedMatches, loadPendingMatches]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const eventSource = new EventSource('/api/v1/events/stream', { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          event: string;
          data: {
            matchId?: number;
            id?: number;
            type?: string;
            payload?: unknown;
            createdAt?: string;
            isRead?: boolean;
            readAt?: string | null;
            [key: string]: unknown;
          };
        };
        switch (payload.event) {
          case 'notification.created': {
            const type = typeof payload.data.type === 'string' ? payload.data.type : '';
            if (type === 'MATCH_REQUEST') {
              loadPendingMatches();
            }
            if (type === 'MATCH_ACCEPT' || type === 'MATCH_REJECT') {
              loadAcceptedMatches();
              loadPendingMatches();
            }
            break;
          }
          case 'message.created':
          case 'message.read':
            if (typeof payload.data.matchId === 'number' && payload.data.matchId > 0) {
              loadAcceptedMatches();
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('EventSource parse error', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user, loadAcceptedMatches, loadPendingMatches]);

  const handleSendMatch = useCallback(
    async (receiverId: number) => {
      setSendingTo(receiverId);
      setError(null);
      try {
        await createMatch({ receiverId });
        await loadAcceptedMatches();
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('マッチングの送信に失敗しました');
        }
      } finally {
        setSendingTo(null);
      }
    },
    [loadAcceptedMatches],
  );

  const handleSearch = useCallback(
    async (criteria: Partial<{ displayName: string; nativeLanguageCode: string; targetLanguageCode: string; targetLevelGte: number }>) => {
      setSearchLoading(true);
      try {
        const response = await listUsers({ mode: 'search', ...criteria });
        setSearchResults(response.users);
      } catch (err) {
        console.error(err);
        setError('検索に失敗しました');
      } finally {
        setSearchLoading(false);
      }
    },
    [],
  );

  const handleSelectRequest = useCallback((match: Match) => {
    setSelectedRequest(match);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  }, []);

  const handleApproveRequest = useCallback(
    async (match: Match) => {
      setError(null);
      try {
        await acceptMatch(match.id);
        await Promise.all([loadAcceptedMatches(), loadPendingMatches()]);
        handleCloseModal();
      } catch (err) {
        console.error(err);
        setError('申請の承認に失敗しました');
      }
    },
    [handleCloseModal, loadAcceptedMatches, loadPendingMatches],
  );

  const handleRejectRequest = useCallback(
    async (match: Match) => {
      setError(null);
      try {
        await rejectMatch(match.id);
        await loadPendingMatches();
        handleCloseModal();
      } catch (err) {
        console.error(err);
        setError('申請の拒否に失敗しました');
      }
    },
    [handleCloseModal, loadPendingMatches],
  );

  const handleUpdateProfile = useCallback(
    async (payload: Partial<{ displayName: string; nativeLanguageCode: string; hobby: string | null; skill: string | null; comment: string | null }>) => {
      try {
        const response = await updateProfile(payload);
        setUser(response.user);
      } catch (err) {
        console.error(err);
        setError('プロフィールの更新に失敗しました');
        throw err;
      }
    },
    [setUser],
  );

  const handleUploadIcon = useCallback(
    async (file: File) => {
      try {
        const response = await uploadIcon(file);
        setUser(response.user);
      } catch (err) {
        console.error(err);
        setError('アイコンのアップロードに失敗しました');
        throw err;
      }
    },
    [setUser],
  );

  const handleAddTarget = useCallback(
    async (payload: { languageCode: string; level: number }) => {
      try {
        const response = await addTargetLanguage(payload);
        setUser(response.user);
      } catch (err) {
        console.error(err);
        setError('ターゲット言語の追加に失敗しました');
        throw err;
      }
    },
    [setUser],
  );

  const handleRemoveTarget = useCallback(
    async (targetId: number) => {
      try {
        await removeTargetLanguage(targetId);
        const refreshed = await getCurrentUser();
        setUser(refreshed.user);
      } catch (err) {
        console.error(err);
        setError('ターゲット言語の削除に失敗しました');
        throw err;
      }
    },
    [setUser],
  );

  const pendingCount = useMemo(() => pendingMatches.length, [pendingMatches]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Lingua Bridge</h1>
            <p className="text-sm text-slate-600">ようこそ、{user.displayName}さん</p>
          </div>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            onClick={logout}
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <nav className="flex gap-2 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
              } shadow`}
            >
              {tab.label}
              {tab.key === 'notifications' && pendingCount > 0 ? (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{pendingCount}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <section className="mt-6">
          {activeTab === 'recommended' ? (
            <RecommendedList users={recommendedUsers} onSendMatch={handleSendMatch} sendingTo={sendingTo} />
          ) : null}

          {activeTab === 'contacts' ? (
            <MatchList matches={matches} currentUserId={user.id} onOpenChat={(matchId) => router.push(`/matches/${matchId}`)} />
          ) : null}

          {activeTab === 'search' ? (
            <SearchPanel
              languages={languages}
              results={searchResults}
              onSearch={handleSearch}
              onSendMatch={handleSendMatch}
              sendingTo={sendingTo}
              loading={searchLoading}
            />
          ) : null}

          {activeTab === 'profile' ? (
            <ProfileEditor
              user={user}
              languages={languages}
              onUpdateProfile={handleUpdateProfile}
              onUploadIcon={handleUploadIcon}
              onAddTargetLanguage={handleAddTarget}
              onRemoveTargetLanguage={handleRemoveTarget}
            />
          ) : null}

          {activeTab === 'notifications' ? (
            <NotificationList
              requests={pendingMatches}
              currentUserId={user.id}
              onSelect={handleSelectRequest}
            />
          ) : null}
        </section>
      </div>
      <MatchRequestModal
        open={isModalOpen}
        match={selectedRequest}
        currentUserId={user.id}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        onClose={handleCloseModal}
      />
    </div>
  );
}
