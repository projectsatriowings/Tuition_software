import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Calendar, Check, Sparkles, Edit3 } from 'lucide-react';

export interface SchedulePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  required?: boolean;
}

const DAYS_OF_WEEK = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' },
];

const QUICK_DAY_PRESETS = [
  { label: 'Weekdays (Mon-Fri)', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { label: 'MWF', days: ['Mon', 'Wed', 'Fri'] },
  { label: 'TTS', days: ['Tue', 'Thu', 'Sat'] },
  { label: 'Weekends', days: ['Sat', 'Sun'] },
  { label: 'Daily', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
];

const COMMON_TIME_SLOTS = [
  { label: '4:00 - 5:30 PM (Evening)', startH: 4, startM: 0, startP: 'PM', endH: 5, endM: 30, endP: 'PM' },
  { label: '5:30 - 7:00 PM (Prime)', startH: 5, startM: 30, startP: 'PM', endH: 7, endM: 0, endP: 'PM' },
  { label: '6:00 - 7:30 PM (Late)', startH: 6, startM: 0, startP: 'PM', endH: 7, endM: 30, endP: 'PM' },
  { label: '10:00 - 11:30 AM (Morning)', startH: 10, startM: 0, startP: 'AM', endH: 11, endM: 30, endP: 'AM' },
  { label: '11:30 AM - 1:00 PM (Noon)', startH: 11, startM: 30, startP: 'AM', endH: 1, endM: 0, endP: 'PM' },
  { label: '2:00 - 3:30 PM (Afternoon)', startH: 2, startM: 0, startP: 'PM', endH: 3, endM: 30, endP: 'PM' },
];

interface TimeState {
  hour: number; // 1-12
  minute: number; // 0-59
  period: 'AM' | 'PM';
}

const timeToMinutes = (t: TimeState): number => {
  let h = t.hour % 12;
  if (t.period === 'PM') h += 12;
  return h * 60 + t.minute;
};

const minutesToTime = (totalMinutes: number): TimeState => {
  let normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  let h = Math.floor(normalized / 60);
  const m = normalized % 60;
  let p: 'AM' | 'PM' = 'AM';
  if (h >= 12) {
    p = 'PM';
    if (h > 12) h -= 12;
  } else if (h === 0) {
    h = 12;
  }
  return { hour: h, minute: m, period: p };
};

const formatScheduleString = (days: string[], start: TimeState, end: TimeState): string => {
  if (days.length === 0) return '';
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sorted = [...days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

  let daysStr = '';
  if (sorted.length === 7) {
    daysStr = 'Daily';
  } else if (sorted.length === 5 && sorted.every((d) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d))) {
    daysStr = 'Weekdays';
  } else if (sorted.length === 2 && sorted.includes('Sat') && sorted.includes('Sun')) {
    daysStr = 'Weekends';
  } else {
    daysStr = sorted.join(', ');
  }

  const startStr = `${start.hour}:${start.minute.toString().padStart(2, '0')} ${start.period}`;
  const endStr = `${end.hour}:${end.minute.toString().padStart(2, '0')} ${end.period}`;
  return `${daysStr} ${startStr} - ${endStr}`;
};

const parseScheduleString = (val: string): { days: string[]; start: TimeState; end: TimeState; isRecognized: boolean } => {
  if (!val || !val.trim()) {
    return {
      days: [],
      start: { hour: 4, minute: 0, period: 'PM' },
      end: { hour: 5, minute: 30, period: 'PM' },
      isRecognized: true,
    };
  }

  const trimmed = val.trim();
  const foundDays: string[] = [];

  if (/Daily/i.test(trimmed)) {
    foundDays.push('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');
  } else if (/Weekdays/i.test(trimmed) || /Mon\s*(?:-|to)\s*Fri/i.test(trimmed)) {
    foundDays.push('Mon', 'Tue', 'Wed', 'Thu', 'Fri');
  } else if (/Weekends/i.test(trimmed) || /Sat\s*(?:-|to|&)\s*Sun/i.test(trimmed)) {
    foundDays.push('Sat', 'Sun');
  } else if (/Mon\s*(?:-|to)\s*Thu/i.test(trimmed)) {
    foundDays.push('Mon', 'Tue', 'Wed', 'Thu');
  } else if (/Mon\s*(?:-|to)\s*Sat/i.test(trimmed)) {
    foundDays.push('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat');
  } else {
    DAYS_OF_WEEK.forEach((d) => {
      const shortPattern = new RegExp(`\\b${d.short}\\b`, 'i');
      const fullPattern = new RegExp(`\\b${d.full}\\b`, 'i');
      if (shortPattern.test(trimmed) || fullPattern.test(trimmed)) {
        if (!foundDays.includes(d.short)) {
          foundDays.push(d.short);
        }
      }
    });
  }

  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi;
  const timeMatches = [...trimmed.matchAll(timeRegex)];
  const validTimes: TimeState[] = [];

  for (const match of timeMatches) {
    const rawH = parseInt(match[1], 10);
    const rawM = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3] ? (match[3].toUpperCase() as 'AM' | 'PM') : null;

    if (rawH >= 1 && rawH <= 12 && rawM >= 0 && rawM <= 59) {
      validTimes.push({
        hour: rawH,
        minute: rawM,
        period: period || (rawH >= 8 && rawH <= 11 ? 'AM' : 'PM'),
      });
    }
  }

  let start: TimeState = { hour: 4, minute: 0, period: 'PM' };
  let end: TimeState = { hour: 5, minute: 30, period: 'PM' };

  if (validTimes.length >= 1) {
    start = validTimes[0];
    if (validTimes.length >= 2) {
      end = validTimes[1];
    } else {
      end = minutesToTime(timeToMinutes(start) + 90);
    }
  }

  const isRecognized = foundDays.length > 0 || validTimes.length > 0;
  return { days: foundDays, start, end, isRecognized };
};

export const SchedulePicker: React.FC<SchedulePickerProps> = ({
  value = '',
  onChange,
  label = 'Schedule & Timing',
  helperText,
}) => {
  const initialParsed = useMemo(() => parseScheduleString(value), []);
  const [selectedDays, setSelectedDays] = useState<string[]>(initialParsed.days);
  const [startTime, setStartTime] = useState<TimeState>(initialParsed.start);
  const [endTime, setEndTime] = useState<TimeState>(initialParsed.end);
  const [isManualMode, setIsManualMode] = useState(!initialParsed.isRecognized);
  const [manualText, setManualText] = useState(value || '');

  const lastSentRef = useRef<string>(value || '');

  // Synchronize on external value change
  useEffect(() => {
    if (value !== lastSentRef.current) {
      lastSentRef.current = value;
      const parsed = parseScheduleString(value);
      setSelectedDays(parsed.days);
      setStartTime(parsed.start);
      setEndTime(parsed.end);
      setManualText(value);
      if (!parsed.isRecognized && value.trim()) {
        setIsManualMode(true);
      }
    }
  }, [value]);

  const updateSchedule = (days: string[], s: TimeState, e: TimeState) => {
    const formatted = formatScheduleString(days, s, e);
    lastSentRef.current = formatted;
    onChange(formatted);
  };

  const handleToggleDay = (dayShort: string) => {
    const updated = selectedDays.includes(dayShort)
      ? selectedDays.filter((d) => d !== dayShort)
      : [...selectedDays, dayShort];
    setSelectedDays(updated);
    updateSchedule(updated, startTime, endTime);
  };

  const handleApplyPreset = (presetDays: string[]) => {
    setSelectedDays(presetDays);
    updateSchedule(presetDays, startTime, endTime);
  };

  const handleApplyTimeSlot = (slot: (typeof COMMON_TIME_SLOTS)[0]) => {
    const newStart: TimeState = { hour: slot.startH, minute: slot.startM, period: slot.startP as any };
    const newEnd: TimeState = { hour: slot.endH, minute: slot.endM, period: slot.endP as any };
    setStartTime(newStart);
    setEndTime(newEnd);
    const days = selectedDays.length === 0 ? ['Mon', 'Wed', 'Fri'] : selectedDays;
    if (selectedDays.length === 0) setSelectedDays(days);
    updateSchedule(days, newStart, newEnd);
  };

  const handleApplyDuration = (durationMinutes: number) => {
    const sMinutes = timeToMinutes(startTime);
    const newEnd = minutesToTime(sMinutes + durationMinutes);
    setEndTime(newEnd);
    const days = selectedDays.length === 0 ? ['Mon', 'Wed', 'Fri'] : selectedDays;
    if (selectedDays.length === 0) setSelectedDays(days);
    updateSchedule(days, startTime, newEnd);
  };

  const durationLabel = useMemo(() => {
    let diff = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (diff <= 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0 && m > 0) return `${h} hr ${m} mins`;
    if (h > 0) return `${h} hr${h > 1 ? 's' : ''}`;
    return `${m} mins`;
  }, [startTime, endTime]);

  return (
    <div className="space-y-2">
      {/* Label and Mode Switch */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block font-bold text-[#4E342E] text-xs">{label}</label>
          {helperText && <p className="text-[11px] text-[#8D6E63]">{helperText}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            const nextMode = !isManualMode;
            setIsManualMode(nextMode);
            if (nextMode) {
              setManualText(value);
            } else {
              const parsed = parseScheduleString(manualText);
              setSelectedDays(parsed.days);
              setStartTime(parsed.start);
              setEndTime(parsed.end);
              updateSchedule(parsed.days, parsed.start, parsed.end);
            }
          }}
          className="text-[11px] font-bold text-[#8D6E63] hover:text-[#4E342E] transition flex items-center gap-1"
        >
          <Edit3 className="w-3 h-3" />
          <span>{isManualMode ? 'Visual Builder' : 'Custom Text'}</span>
        </button>
      </div>

      {isManualMode ? (
        <div>
          <input
            type="text"
            placeholder="e.g. Mon, Wed, Fri 4:00 PM - 5:30 PM"
            value={manualText}
            onChange={(e) => {
              setManualText(e.target.value);
              lastSentRef.current = e.target.value;
              onChange(e.target.value);
            }}
            className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#2D1E18] focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
          />
        </div>
      ) : (
        <div className="p-3 bg-[#FAF8F5] border border-[#D7CCC8] rounded-2xl space-y-2.5 text-xs">
          {/* Active Schedule Summary Badge */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border border-[#EFEBE9] rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#2D1E18]">
              <Clock className="w-3.5 h-3.5 text-[#6D4C41]" />
              <span>
                {selectedDays.length > 0
                  ? formatScheduleString(selectedDays, startTime, endTime)
                  : 'No days selected yet (select days below)'}
              </span>
            </div>
            {selectedDays.length > 0 && (
              <span className="text-[10px] font-bold text-[#6D4C41] bg-[#F7F2EF] px-2 py-0.5 rounded-md border border-[#D7CCC8]">
                {durationLabel}
              </span>
            )}
          </div>

          {/* 1. Day Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#4E342E]">Select Class Days:</span>
              <div className="flex items-center gap-1">
                {QUICK_DAY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p.days)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#4E342E] hover:text-white transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.short);
                return (
                  <button
                    key={d.short}
                    type="button"
                    onClick={() => handleToggleDay(d.short)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#4E342E] text-white shadow-sm'
                        : 'bg-white border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#F7F2EF]'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Timing Controls (Compact Digital Controls) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#EFEBE9]">
            {/* Start Time */}
            <div className="flex items-center justify-between p-2 bg-white border border-[#EFEBE9] rounded-xl">
              <span className="text-[11px] font-bold text-[#4E342E]">Start Time:</span>
              <div className="flex items-center gap-1.5">
                <select
                  value={startTime.hour}
                  onChange={(e) => {
                    const next = { ...startTime, hour: parseInt(e.target.value, 10) };
                    setStartTime(next);
                    updateSchedule(selectedDays, next, endTime);
                  }}
                  className="bg-[#FAF8F5] border border-[#D7CCC8] rounded-lg px-2 py-1 text-xs font-bold text-[#2D1E18] focus:ring-1 focus:ring-[#8D6E63]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-[#8D6E63]">:</span>
                <select
                  value={startTime.minute}
                  onChange={(e) => {
                    const next = { ...startTime, minute: parseInt(e.target.value, 10) };
                    setStartTime(next);
                    updateSchedule(selectedDays, next, endTime);
                  }}
                  className="bg-[#FAF8F5] border border-[#D7CCC8] rounded-lg px-2 py-1 text-xs font-bold text-[#2D1E18] focus:ring-1 focus:ring-[#8D6E63]"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <div className="flex items-center bg-[#FAF8F5] border border-[#D7CCC8] rounded-lg p-0.5">
                  {(['AM', 'PM'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const next = { ...startTime, period: p };
                        setStartTime(next);
                        updateSchedule(selectedDays, next, endTime);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        startTime.period === p ? 'bg-[#4E342E] text-white' : 'text-[#8D6E63]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* End Time */}
            <div className="flex items-center justify-between p-2 bg-white border border-[#EFEBE9] rounded-xl">
              <span className="text-[11px] font-bold text-[#4E342E]">End Time:</span>
              <div className="flex items-center gap-1.5">
                <select
                  value={endTime.hour}
                  onChange={(e) => {
                    const next = { ...endTime, hour: parseInt(e.target.value, 10) };
                    setEndTime(next);
                    updateSchedule(selectedDays, startTime, next);
                  }}
                  className="bg-[#FAF8F5] border border-[#D7CCC8] rounded-lg px-2 py-1 text-xs font-bold text-[#2D1E18] focus:ring-1 focus:ring-[#8D6E63]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-[#8D6E63]">:</span>
                <select
                  value={endTime.minute}
                  onChange={(e) => {
                    const next = { ...endTime, minute: parseInt(e.target.value, 10) };
                    setEndTime(next);
                    updateSchedule(selectedDays, startTime, next);
                  }}
                  className="bg-[#FAF8F5] border border-[#D7CCC8] rounded-lg px-2 py-1 text-xs font-bold text-[#2D1E18] focus:ring-1 focus:ring-[#8D6E63]"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <div className="flex items-center bg-[#FAF8F5] border border-[#D7CCC8] rounded-lg p-0.5">
                  {(['AM', 'PM'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const next = { ...endTime, period: p };
                        setEndTime(next);
                        updateSchedule(selectedDays, startTime, next);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        endTime.period === p ? 'bg-[#4E342E] text-white' : 'text-[#8D6E63]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Duration + Preset Slots */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
            <div className="flex items-center gap-1 text-[10px]">
              <span className="font-bold text-[#8D6E63]">Duration:</span>
              {[
                { label: '+45m', mins: 45 },
                { label: '+1h', mins: 60 },
                { label: '+1.5h', mins: 90 },
                { label: '+2h', mins: 120 },
              ].map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => handleApplyDuration(d.mins)}
                  className="px-2 py-0.5 rounded bg-white border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#4E342E] hover:text-white transition font-medium"
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              <span className="font-bold text-[#8D6E63]">Popular Slots:</span>
              <button
                type="button"
                onClick={() => handleApplyTimeSlot(COMMON_TIME_SLOTS[0])}
                className="px-2 py-0.5 rounded bg-white border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#4E342E] hover:text-white transition font-medium"
              >
                4:00 - 5:30 PM
              </button>
              <button
                type="button"
                onClick={() => handleApplyTimeSlot(COMMON_TIME_SLOTS[1])}
                className="px-2 py-0.5 rounded bg-white border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#4E342E] hover:text-white transition font-medium"
              >
                5:30 - 7:00 PM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SchedulePicker;
