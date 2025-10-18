"use client";

import { useEffect, useMemo, useState } from 'react';

import type { Message, Schedule } from '@/types/domain';

type Props = {
  message: Message;
  isMine: boolean;
  currentUserId: number;
  onAccept?: (scheduleId: number) => Promise<void>;
  onCancel?: (scheduleId: number) => Promise<void>;
  acceptingScheduleId?: number | null;
  cancelingScheduleId?: number | null;
  onNavigateToCalendar?: () => void;
};

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatScheduleTime(schedule: Schedule) {
  const start = dateTimeFormatter.format(new Date(schedule.startTime));
  const end = dateTimeFormatter.format(new Date(schedule.endTime));
  return `${start} 〜 ${end}`;
}

function scheduleLabel(schedule: Schedule, index: number) {
  const statusLabel =
    schedule.status === 'PROPOSED'
      ? '提案中'
      : schedule.status === 'CONFIRMED'
        ? '登録済み'
        : '廃棄済み';
  return `候補 ${index + 1} (${statusLabel})`;
}

export function ScheduleMessageItem({
  message,
  isMine,
  currentUserId,
  onAccept,
  onCancel,
  acceptingScheduleId,
  cancelingScheduleId,
  onNavigateToCalendar,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    message.schedules?.[0]?.id ?? null,
  );

  const schedules = useMemo(() => message.schedules ?? [], [message.schedules]);
  const firstSchedule = schedules[0];
  const isReceiver = firstSchedule ? firstSchedule.receiverId === currentUserId : false;
  useEffect(() => {
    if (schedules.length === 0) {
      setSelectedScheduleId(null);
      return;
    }
    setSelectedScheduleId((prev) => {
      if (prev && schedules.some((schedule) => schedule.id === prev && schedule.status !== 'CANCELLED')) {
        return prev;
      }
      const available = schedules.find((schedule) => schedule.status !== 'CANCELLED');
      return available?.id ?? schedules[0].id;
    });
  }, [schedules]);

  const handleCollapse = () => {
    setCollapsed(true);
  };

  const handleExpand = () => {
    setCollapsed(false);
  };

  const handleAccept = async () => {
    if (!onAccept || !selectedScheduleId) {
      return;
    }
    await onAccept(selectedScheduleId);
  };

  const handleCancel = async (scheduleId: number) => {
    if (!onCancel) {
      return;
    }
    await onCancel(scheduleId);
  };

  const selectedSchedule =
    schedules.find((schedule) => schedule.id === selectedScheduleId) ?? schedules[0] ?? null;

  if (collapsed) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
          onClick={handleExpand}
        >
          閉じた予定メッセージを表示
        </button>
      </div>
    );
  }

  if (message.type === 'SCHEDULE_CANCELLED') {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] rounded-lg px-4 py-3 text-sm shadow-sm ${
            isMine ? 'bg-blue-50 text-slate-900' : 'bg-slate-100 text-slate-900'
          }`}
        >
          <p className="font-semibold text-slate-900">予定メッセージ</p>
          <p className="mt-1 text-sm">メッセージが廃棄されました。</p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="text-xs text-slate-500 hover:underline"
              onClick={handleCollapse}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!firstSchedule) {
    return null;
  }

  if (message.type === 'SCHEDULE_PROPOSAL') {
    const isAccepting = acceptingScheduleId != null;
    const isCanceling = cancelingScheduleId != null;
    const disableActions = isAccepting || isCanceling;
    const registerDisabled =
      !selectedSchedule || selectedSchedule.status !== 'PROPOSED' || disableActions;
    const senderCancelDisabled = disableActions || schedules.every((schedule) => schedule.status === 'CANCELLED');

    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] rounded-lg px-4 py-3 text-sm shadow-sm ${
            isMine ? 'bg-blue-50 text-slate-900' : 'bg-slate-100 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">予定の提案</p>
            <button
              type="button"
              className="text-xs text-slate-500 hover:underline"
              onClick={handleCollapse}
            >
              閉じる
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {schedules.map((schedule, index) => {
              const disabled = schedule.status === 'CANCELLED';
              return (
                <label key={schedule.id} className="block rounded-md border border-slate-200 bg-white/70 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`schedule-${message.id}`}
                      disabled={disabled || disableActions || !isReceiver}
                      checked={selectedScheduleId === schedule.id}
                      onChange={() => setSelectedScheduleId(schedule.id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{scheduleLabel(schedule, index)}</p>
                      <p className="text-xs text-slate-600">{formatScheduleTime(schedule)}</p>
                      {schedule.note ? (
                        <p className="mt-1 text-[11px] text-slate-500">メモ: {schedule.note}</p>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {isReceiver ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleAccept()}
                disabled={registerDisabled}
              >
                {acceptingScheduleId === selectedSchedule?.id ? '登録中...' : '登録'}
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleCancel(selectedSchedule?.id ?? firstSchedule.id)}
                disabled={disableActions || !selectedSchedule}
              >
                {cancelingScheduleId === selectedSchedule?.id ? '破棄中...' : '破棄'}
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial sm:min-w-[120px]"
                onClick={() => void handleCancel(firstSchedule.id)}
                disabled={senderCancelDisabled}
              >
                {cancelingScheduleId === firstSchedule.id ? '破棄中...' : '破棄'}
              </button>
              <p className="text-xs text-slate-500 sm:self-center">相手の登録待ちです</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'SCHEDULE_CONFIRMED') {
    const isCanceling = cancelingScheduleId != null;
    const confirmedSchedule =
      schedules.find((schedule) => schedule.status === 'CONFIRMED') ?? schedules[0];

    if (!confirmedSchedule) {
      return null;
    }

    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] rounded-lg px-4 py-3 text-sm shadow-sm ${
            isMine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{isMine ? '登録した予定' : '予定が登録されました'}</p>
            <button
              type="button"
              className="text-xs opacity-80 hover:underline"
              onClick={handleCollapse}
            >
              閉じる
            </button>
          </div>
          <p className="mt-2 text-sm">{formatScheduleTime(confirmedSchedule)}</p>
          {confirmedSchedule.note ? (
            <p className="mt-2 text-xs opacity-80">メモ: {confirmedSchedule.note}</p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3">
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                isMine ? 'bg-white text-blue-600 hover:bg-white/90' : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
              onClick={onNavigateToCalendar}
            >
              カレンダーで確認
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial sm:min-w-[120px]"
              onClick={() => void handleCancel(confirmedSchedule.id)}
              disabled={isCanceling}
            >
              {cancelingScheduleId === confirmedSchedule.id ? '破棄中...' : '破棄'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
