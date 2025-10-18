"use client";

import { useMemo, useState } from 'react';

import type { Message } from '@/types/domain';

type Props = {
  message: Message;
  isMine: boolean;
  currentUserId: number;
  onAccept?: (scheduleId: number) => Promise<void>;
  accepting?: boolean;
  onNavigateToCalendar?: () => void;
};

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function ScheduleMessageItem({ message, isMine, currentUserId, onAccept, accepting, onNavigateToCalendar }: Props) {
  const [selected, setSelected] = useState(true);
  const schedule = message.schedule;

  const timeLabel = useMemo(() => {
    if (!schedule) {
      return '';
    }
    const start = dateTimeFormatter.format(new Date(schedule.startTime));
    const end = dateTimeFormatter.format(new Date(schedule.endTime));
    return `${start} 〜 ${end}`;
  }, [schedule]);

  if (!schedule) {
    return null;
  }

  const isReceiver = schedule.receiverId === currentUserId;
  const isProposed = schedule.status === 'PROPOSED';

  const containerClasses = `max-w-[80%] rounded-lg px-4 py-3 text-sm shadow-sm ${
    isMine ? 'bg-blue-50 text-slate-900' : 'bg-slate-100 text-slate-900'
  }`;

  const handleAccept = async () => {
    if (!onAccept || !isProposed || !isReceiver || accepting || !selected) {
      return;
    }
    await onAccept(schedule.id);
  };

  if (message.type === 'SCHEDULE_PROPOSAL') {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className={containerClasses}>
          <p className="text-sm font-semibold text-slate-900">予定の提案</p>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`schedule-${schedule.id}`}
                checked={selected}
                onChange={() => setSelected(true)}
                className="h-4 w-4 accent-blue-600"
              />
              <span>{timeLabel}</span>
            </label>
            {schedule.note ? <p className="text-xs text-slate-600">メモ: {schedule.note}</p> : null}
          </div>
          {isReceiver ? (
            <button
              type="button"
              className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleAccept()}
              disabled={!selected || accepting}
            >
              {accepting ? '登録中...' : '登録'}
            </button>
          ) : (
            <p className="mt-3 text-xs text-slate-500">相手の登録待ちです</p>
          )}
        </div>
      </div>
    );
  }

  const noteSection =
    schedule.note && schedule.note.length > 0 ? <p className="mt-2 text-xs text-slate-600">メモ: {schedule.note}</p> : null;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <button
        type="button"
        className={`${containerClasses} text-left transition hover:shadow-md`}
        onClick={onNavigateToCalendar}
      >
        <p className="text-sm font-semibold text-slate-900">予定を登録しました</p>
        <p className="mt-1 text-sm text-slate-700">{timeLabel}</p>
        {noteSection}
        <p className="mt-2 text-[11px] text-slate-500">クリックするとカレンダーを開きます</p>
      </button>
    </div>
  );
}
