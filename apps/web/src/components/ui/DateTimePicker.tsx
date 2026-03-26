'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface DateTimePickerProps {
  /** ISO string value (UTC). Displayed in local time. */
  value?: string;
  onChange: (isoString: string) => void;
  disabled?: boolean;
  /** If true, time ticks every second until the user edits either field */
  liveUpdate?: boolean;
  label?: string;
}

/**
 * Reusable date + time picker with optional live-updating time.
 * - date: native date picker (calendar popup)
 * - time: native time input (spinner)
 * - Outputs UTC ISO string for the backend
 * - Displays local time for the user
 */
export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  liveUpdate = true,
  label = 'Fecha y Hora',
}: DateTimePickerProps) {
  const [userEdited, setUserEdited] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse value or now into local date/time strings
  const toLocalParts = useCallback((isoStr?: string) => {
    const d = isoStr ? new Date(isoStr) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  }, []);

  const [datePart, setDatePart] = useState(() => toLocalParts(value).date);
  const [timePart, setTimePart] = useState(() => toLocalParts(value).time);

  // If value is provided externally (edit mode), stop live update
  useEffect(() => {
    if (value) {
      setUserEdited(true);
      const parts = toLocalParts(value);
      setDatePart(parts.date);
      setTimePart(parts.time);
    }
  }, [value, toLocalParts]);

  // Live-update the time every second until user edits
  useEffect(() => {
    if (!liveUpdate || userEdited || disabled) return;

    const tick = () => {
      const parts = toLocalParts();
      setDatePart(parts.date);
      setTimePart(parts.time);
      // Emit the current time as UTC
      onChange(new Date().toISOString());
    };

    tick(); // run immediately
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveUpdate, userEdited, disabled, toLocalParts, onChange]);

  // Combine date + time parts into a UTC ISO string and emit
  const emitChange = useCallback(
    (newDate: string, newTime: string) => {
      const localDateTime = new Date(`${newDate}T${newTime}:00`);
      if (!isNaN(localDateTime.getTime())) {
        onChange(localDateTime.toISOString());
      }
    },
    [onChange],
  );

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserEdited(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const newDate = e.target.value;
    setDatePart(newDate);
    emitChange(newDate, timePart);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserEdited(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const newTime = e.target.value;
    setTimePart(newTime);
    emitChange(datePart, newTime);
  };

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-md border border-slate-300 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-100 disabled:text-slate-400';

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={datePart}
            onChange={handleDateChange}
            className={`${inputClass} pl-9`}
            disabled={disabled}
          />
        </div>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="time"
            value={timePart}
            onChange={handleTimeChange}
            className={`${inputClass} pl-9`}
            disabled={disabled}
          />
        </div>
      </div>
      {liveUpdate && !userEdited && !disabled && (
        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Actualizando en tiempo real
        </p>
      )}
    </div>
  );
}
