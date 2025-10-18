"use client";

import { useEffect, useState, type ChangeEvent } from 'react';

type ScheduleModalValues = {
  date: string;
  startTime: string;
  endTime: string;
  note: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAction: (action: 'confirm' | 'propose', values: ScheduleModalValues) => Promise<void>;
  loadingAction: 'confirm' | 'propose' | null;
  errorMessage?: string | null;
};

const initialValues: ScheduleModalValues = {
  date: '',
  startTime: '',
  endTime: '',
  note: '',
};

export function ScheduleModal({ open, onClose, onAction, loadingAction, errorMessage }: Props) {
  const [form, setForm] = useState<ScheduleModalValues>(initialValues);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(initialValues);
      setLocalError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleChange = (field: keyof ScheduleModalValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const validate = () => {
    if (!form.date || !form.startTime || !form.endTime) {
      setLocalError('日付と開始時間・終了時間を入力してください');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const handleAction = async (action: 'confirm' | 'propose') => {
    if (!validate()) {
      return;
    }
    await onAction(action, form);
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
          <div>
            <label className="block text-sm font-medium text-slate-700">日付</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.date}
              onChange={handleChange('date')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">開始時間</label>
              <input
                type="time"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.startTime}
                onChange={handleChange('startTime')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">終了時間</label>
              <input
                type="time"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.endTime}
                onChange={handleChange('endTime')}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">メモ（任意）</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="メモがあれば入力してください"
              value={form.note}
              onChange={handleChange('note')}
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
            {loadingAction === 'propose' ? '送信中...' : '送信'}
          </button>
        </div>
      </div>
    </div>
  );
}
