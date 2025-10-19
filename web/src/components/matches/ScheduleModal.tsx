"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';

type ScheduleSlot = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAction: (
    action: 'confirm' | 'propose',
    values: { slots: Array<{ date: string; startTime: string; endTime: string }>; note: string },
  ) => Promise<void>;
  loadingAction: 'confirm' | 'propose' | null;
  errorMessage?: string | null;
};

const createEmptySlot = (seed = Date.now()): ScheduleSlot => ({
  id: seed,
  date: '',
  startTime: '',
  endTime: '',
});

export function ScheduleModal({ open, onClose, onAction, loadingAction, errorMessage }: Props) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([createEmptySlot()]);
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSlots([createEmptySlot()]);
      setNote('');
      setLocalError(null);
    }
  }, [open]);

  const hasMultipleSlots = useMemo(() => slots.length > 1, [slots.length]);

  if (!open) {
    return null;
  }

  const handleSlotChange = (slotId: number, field: keyof Omit<ScheduleSlot, 'id'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, [field]: value } : slot)));
    };

  const handleRemoveSlot = (slotId: number) => {
    if (slots.length === 1) {
      return;
    }
    setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
  };

  const handleAddSlot = () => {
    setSlots((prev) => [...prev, createEmptySlot(Date.now() + prev.length)]);
  };

  const validateSlots = (action: 'confirm' | 'propose') => {
    for (const slot of slots) {
      if (!slot.date || !slot.startTime || !slot.endTime) {
        setLocalError('全ての候補に日付・開始時間・終了時間を入力してください');
        return false;
      }
    }

    if (action === 'confirm' && slots.length !== 1) {
      setLocalError('登録では候補を1件のみ指定してください');
      return false;
    }

    setLocalError(null);
    return true;
  };

  const handleAction = async (action: 'confirm' | 'propose') => {
    if (!validateSlots(action)) {
      return;
    }

    const payloadSlots = (action === 'confirm' ? slots.slice(0, 1) : slots).map((slot) => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));

    await onAction(action, {
      slots: payloadSlots,
      note,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">交流予定を追加</h2>
          <button type="button" className="text-2xl text-slate-500 hover:text-slate-700" onClick={onClose} aria-label="閉じる">
            &times;
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div key={slot.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">候補 {index + 1}</p>
                  {slots.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => handleRemoveSlot(slot.id)}
                    >
                      削除
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">日付</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={slot.date}
                      onChange={handleSlotChange(slot.id, 'date')}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">開始時間</label>
                      <input
                        type="time"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={slot.startTime}
                        onChange={handleSlotChange(slot.id, 'startTime')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">終了時間</label>
                      <input
                        type="time"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={slot.endTime}
                        onChange={handleSlotChange(slot.id, 'endTime')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full rounded-md border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={handleAddSlot}
          >
            候補を追加
          </button>
          <div>
            <label className="block text-sm font-medium text-slate-700">メモ（任意）</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="メモがあれば入力してください"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        {localError ? <p className="mt-4 text-sm text-red-600">{localError}</p> : null}
        {errorMessage ? <p className="mt-1 text-sm text-red-600">{errorMessage}</p> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleAction('confirm')}
            disabled={loadingAction === 'confirm'}
          >
            {loadingAction === 'confirm' ? '登録中...' : '登録'}
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleAction('propose')}
            disabled={loadingAction === 'propose'}
          >
            {loadingAction === 'propose' ? '提案中...' : '予定の提案'}
          </button>
        </div>
        {hasMultipleSlots ? <p className="mt-2 text-xs text-slate-500">※ 予定の提案は複数候補をまとめて送信できます。</p> : null}
      </div>
    </div>
  );
}
