"use client";

import { useMemo } from 'react';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

import type { ScheduleWithCounterpart } from '@/types/domain';

type Props = {
  schedules: ScheduleWithCounterpart[];
  locale?: string;
};

export function CalendarPanel({ schedules, locale = 'ja' }: Props) {
  const events = useMemo(() => {
    const statusLabelMap: Record<string, string> = {
      PROPOSED: '提案中',
      CONFIRMED: '登録済み',
      CANCELLED: 'キャンセル',
      COMPLETED: '完了',
    };

    return schedules.map((schedule) => {
      const statusLabel = statusLabelMap[schedule.status] ?? '予定';
      const noteSuffix = schedule.note ? ` / ${schedule.note}` : '';
      return {
        id: String(schedule.id),
        title: `${schedule.counterpart.displayName} さん (${statusLabel})${noteSuffix}`,
        start: schedule.startTime,
        end: schedule.endTime,
        allDay: false,
        extendedProps: {
          note: schedule.note,
          status: schedule.status,
        },
      };
    });
  }, [schedules]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          start: 'prev,next today',
          center: 'title',
          end: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        locale={locale}
        height="auto"
        events={events}
        nowIndicator
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  );
}
