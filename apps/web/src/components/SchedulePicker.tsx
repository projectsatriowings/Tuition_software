import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Calendar, ChevronDown, ChevronUp, Check, Sparkles, Edit3, ArrowRight, ArrowLeft } from 'lucide-react';

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

const formatTime = (t: TimeState): string => {
  const mm = t.minute.toString().padStart(2, '0');
  return `${t.hour}:${mm} ${t.period}`;
};

const formatScheduleString = (days: string[], start: TimeState, end: TimeState): string => {
  if (days.length === 0) return '';

  let daysStr = '';
  const weekdaysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekendOrder = ['Sat', 'Sun'];

  const hasAllWeekdays = weekdaysOrder.every((d) => days.includes(d)) && days.length === 5;
  const hasAllWeekend = weekendOrder.every((d) => days.includes(d)) && days.length === 2;
  const hasAll7Days = days.length === 7;

  if (hasAll7Days) {
    daysStr = 'Daily (Mon-Sun)';
  } else if (hasAllWeekdays) {
    daysStr = 'Mon - Fri';
  } else if (hasAllWeekend) {
    daysStr = 'Sat & Sun';
  } else if (days.length === 2) {
    const sorted = [...days].sort(
      (a, b) => DAYS_OF_WEEK.findIndex((d) => d.short === a) - DAYS_OF_WEEK.findIndex((d) => d.short === b)
    );
    daysStr = sorted.join(' & ');
  } else {
    const sorted = [...days].sort(
      (a, b) => DAYS_OF_WEEK.findIndex((d) => d.short === a) - DAYS_OF_WEEK.findIndex((d) => d.short === b)
    );
    daysStr = sorted.join(', ');
  }

  const startStr = formatTime(start);
  const endStr = formatTime(end);

  return `${daysStr} • ${startStr} - ${endStr}`;
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

  // Parse times: match HH:MM AM/PM or HH AM/PM
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
  required = false,
}) => {
  // Parse initial state from incoming value
  const initialParsed = useMemo(() => parseScheduleString(value), []);

  const [selectedDays, setSelectedDays] = useState<string[]>(initialParsed.days);
  const [startTime, setStartTime] = useState<TimeState>(initialParsed.start);
  const [endTime, setEndTime] = useState<TimeState>(initialParsed.end);

  // UI interaction states
  const [activeTimeTarget, setActiveTimeTarget] = useState<'start' | 'end'>('start');
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour');
  const [isManualMode, setIsManualMode] = useState(!initialParsed.isRecognized);
  const [manualText, setManualText] = useState(value || '');
  const [isExpanded, setIsExpanded] = useState(true);

  const clockRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);
  const lastSentValueRef = useRef<string>(value || '');

  // Synchronize when value prop changes externally (e.g. switching between subjects or batches)
  useEffect(() => {
    if (value === lastSentValueRef.current) return;
    lastSentValueRef.current = value || '';
    setManualText(value || '');

    if (!value || !value.trim()) {
      setSelectedDays([]);
      setStartTime({ hour: 4, minute: 0, period: 'PM' });
      setEndTime({ hour: 5, minute: 30, period: 'PM' });
      return;
    }

    const parsed = parseScheduleString(value);
    if (parsed.isRecognized) {
      setSelectedDays(parsed.days);
      setStartTime(parsed.start);
      setEndTime(parsed.end);
    } else {
      setIsManualMode(true);
    }
  }, [value]);

  // Propagate changes when picker state changes
  const updateVisualSelection = (newDays: string[], newStart: TimeState, newEnd: TimeState) => {
    const formatted = formatScheduleString(newDays, newStart, newEnd);
    setManualText(formatted);
    lastSentValueRef.current = formatted;
    onChange(formatted);
  };

  // Day toggle handler
  const handleToggleDay = (day: string) => {
    let newDays: string[];
    if (selectedDays.includes(day)) {
      newDays = selectedDays.filter((d) => d !== day);
    } else {
      newDays = [...selectedDays, day];
    }
    setSelectedDays(newDays);
    updateVisualSelection(newDays, startTime, endTime);
  };

  // Quick preset apply
  const handleApplyDayPreset = (presetDays: string[]) => {
    setSelectedDays(presetDays);
    updateVisualSelection(presetDays, startTime, endTime);
  };

  // Active time target (Start or End time)
  const currentTime = activeTimeTarget === 'start' ? startTime : endTime;

  const setCurrentTime = (updater: (prev: TimeState) => TimeState) => {
    if (activeTimeTarget === 'start') {
      const nextStart = updater(startTime);
      setStartTime(nextStart);

      // Check if endTime needs pushing forward so that end > start
      const sM = timeToMinutes(nextStart);
      const eM = timeToMinutes(endTime);
      let nextEnd = endTime;
      if (eM <= sM) {
        // Automatically default end time to 90 mins after start time
        nextEnd = minutesToTime(sM + 90);
        setEndTime(nextEnd);
      }

      // If no days were selected yet, default to weekdays when picking time
      const daysToUse = selectedDays.length === 0 ? ['Mon', 'Wed', 'Fri'] : selectedDays;
      if (selectedDays.length === 0) {
        setSelectedDays(daysToUse);
      }

      updateVisualSelection(daysToUse, nextStart, nextEnd);
    } else {
      const nextEnd = updater(endTime);
      setEndTime(nextEnd);

      const daysToUse = selectedDays.length === 0 ? ['Mon', 'Wed', 'Fri'] : selectedDays;
      if (selectedDays.length === 0) {
        setSelectedDays(daysToUse);
      }

      updateVisualSelection(daysToUse, startTime, nextEnd);
    }
  };

  // Calculate duration between startTime and endTime
  const durationText = useMemo(() => {
    const sM = timeToMinutes(startTime);
    let eM = timeToMinutes(endTime);
    if (eM <= sM) eM += 24 * 60; // Next day span

    const diff = eM - sM;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    if (hours === 0 && mins === 0) return '0 min';
    if (hours === 0) return `${mins} min${mins > 1 ? 's' : ''}`;
    if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
  }, [startTime, endTime]);

  // Adjust duration from Start Time
  const applyDuration = (durationMinutes: number) => {
    const sM = timeToMinutes(startTime);
    const newEnd = minutesToTime(sM + durationMinutes);
    setEndTime(newEnd);

    const daysToUse = selectedDays.length === 0 ? ['Mon', 'Wed', 'Fri'] : selectedDays;
    if (selectedDays.length === 0) {
      setSelectedDays(daysToUse);
    }

    updateVisualSelection(daysToUse, startTime, newEnd);
  };

  // Apply quick tuition slot preset
  const applyTimeSlotPreset = (slot: (typeof COMMON_TIME_SLOTS)[0]) => {
    const newStart: TimeState = { hour: slot.startH, minute: slot.startM, period: slot.startP as any };
    const newEnd: TimeState = { hour: slot.endH, minute: slot.endM, period: slot.endP as any };
    setStartTime(newStart);
    setEndTime(newEnd);

    const daysToUse = selectedDays.length === 0 ? ['Mon', 'Wed', 'Fri'] : selectedDays;
    if (selectedDays.length === 0) {
      setSelectedDays(daysToUse);
    }

    updateVisualSelection(daysToUse, newStart, newEnd);
  };

  // Handle fine-tune adjustments (+/- minutes)
  const adjustMinutes = (delta: number) => {
    setCurrentTime((prev) => {
      const currentM = timeToMinutes(prev);
      return minutesToTime(currentM + delta);
    });
  };

  // Clock dial constants
  const clockSize = 200;
  const cx = clockSize / 2;
  const cy = clockSize / 2;
  const radius = 70;

  // Calculate time from coordinate
  const calculateTimeFromCoords = (clientX: number, clientY: number, mode: 'hour' | 'minute') => {
    if (!clockRef.current) return null;
    const rect = clockRef.current.getBoundingClientRect();
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cy;

    // Angle in degrees from 12 o'clock clockwise
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === 'hour') {
      let h = Math.round(angle / 30);
      if (h === 0 || h === 12) h = 12;
      return h;
    } else {
      let m = Math.round(angle / 6) % 60;
      // Snap to nearest 5 minutes for clean scheduling
      const remainder = m % 5;
      if (remainder <= 2) m -= remainder;
      else m += 5 - remainder;
      if (m === 60) m = 0;
      return m;
    }
  };

  // Pointer event handlers for smooth click and drag on clock dial
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    const val = calculateTimeFromCoords(e.clientX, e.clientY, clockMode);
    if (val !== null) {
      if (clockMode === 'hour') {
        setCurrentTime((prev) => ({ ...prev, hour: val }));
      } else {
        setCurrentTime((prev) => ({ ...prev, minute: val }));
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    const val = calculateTimeFromCoords(e.clientX, e.clientY, clockMode);
    if (val !== null) {
      if (clockMode === 'hour') {
        setCurrentTime((prev) => ({ ...prev, hour: val }));
      } else {
        setCurrentTime((prev) => ({ ...prev, minute: val }));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    // Auto switch from hour to minute mode for intuitive speed
    if (clockMode === 'hour') {
      setTimeout(() => {
        setClockMode('minute');
      }, 200);
    }
  };

  // Compute pointer angle & coordinates
  const pointerAngle = useMemo(() => {
    if (clockMode === 'hour') {
      const h = currentTime.hour % 12;
      return (h * 30 - 90) * (Math.PI / 180);
    } else {
      const m = currentTime.minute;
      return (m * 6 - 90) * (Math.PI / 180);
    }
  }, [clockMode, currentTime.hour, currentTime.minute]);

  const pointerX = cx + radius * Math.cos(pointerAngle);
  const pointerY = cy + radius * Math.sin(pointerAngle);

  // Hour numbers (1 - 12)
  const hourMarkers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  // Minute markers (00 - 55 in 5 min intervals)
  const minuteMarkers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="block font-bold text-[#4E342E] text-xs">
            {label} {required && <span className="text-rose-600">*</span>}
          </label>
          {helperText && <p className="text-[11px] text-[#8D6E63] mt-0.5">{helperText}</p>}
        </div>
        <button
          type="button"
          onClick={() => setIsManualMode(!isManualMode)}
          className="text-[11px] font-semibold text-[#8D6E63] hover:text-[#4E342E] flex items-center gap-1.5 transition bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#D7CCC8]"
        >
          <Edit3 className="w-3 h-3" />
          {isManualMode ? 'Clock & Day Picker' : 'Custom Text'}
        </button>
      </div>

      {/* Manual text mode fallback */}
      {isManualMode ? (
        <div className="space-y-1.5">
          <input
            type="text"
            value={manualText}
            onChange={(e) => {
              setManualText(e.target.value);
              lastSentValueRef.current = e.target.value;
              onChange(e.target.value);
            }}
            placeholder="e.g. Mon & Wed • 4:00 PM - 5:30 PM"
            className="w-full bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#8D6E63] focus:outline-none"
          />
          <p className="text-[10px] text-[#A1887F]">
            Custom text mode is active. You can switch back to the interactive clock selector anytime.
          </p>
        </div>
      ) : (
        <div className="bg-[#FAF8F5] border border-[#D7CCC8] rounded-2xl p-3.5 space-y-3.5 shadow-xs">
          {/* Header Preview Bar */}
          <div className="flex items-center justify-between bg-white border border-[#EADED5] rounded-xl px-3 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#F7F2EF] text-[#4E342E] flex items-center justify-center shrink-0 border border-[#EADED5]">
                <Clock className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wider flex items-center gap-2">
                  <span>Configured Schedule</span>
                  {selectedDays.length > 0 && (
                    <span className="text-[10px] font-bold text-[#4E342E] bg-[#EADED5] px-1.5 py-0.5 rounded">
                      ⏱️ {durationText}
                    </span>
                  )}
                </div>
                <div className="text-xs font-black text-[#2D1E18] truncate mt-0.5">
                  {manualText || (
                    <span className="text-[#A1887F] font-normal italic">
                      No schedule set (select days and time below)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {manualText && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDays([]);
                    setManualText('');
                    lastSentValueRef.current = '';
                    onChange('');
                  }}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition"
                  title="Clear schedule"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-[#8D6E63] hover:text-[#4E342E] hover:bg-[#FAF8F5] rounded-lg transition"
                title={isExpanded ? 'Collapse schedule picker' : 'Expand schedule picker'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="space-y-4 pt-1">
              {/* SECTION 1: DAYS OF WEEK SELECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#4E342E] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8D6E63]" /> 1. Select Days
                  </span>
                  <span className="text-[10px] font-semibold text-[#8D6E63]">
                    {selectedDays.length === 0 ? 'No days selected' : `${selectedDays.length} day(s) selected`}
                  </span>
                </div>

                {/* Day Buttons Row */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = selectedDays.includes(d.short);
                    return (
                      <button
                        key={d.short}
                        type="button"
                        onClick={() => handleToggleDay(d.short)}
                        title={d.full}
                        className={`h-9 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#4E342E] text-white shadow-sm ring-2 ring-[#4E342E]/20 scale-[1.02]'
                            : 'bg-white text-[#6D4C41] border border-[#D7CCC8] hover:bg-[#F2ECE7] hover:border-[#BCAAA4]'
                        }`}
                      >
                        <span>{d.short}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Presets for Days */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-[#A1887F] font-semibold mr-1">Presets:</span>
                  {QUICK_DAY_PRESETS.map((p) => {
                    const isCurrent =
                      p.days.length === selectedDays.length && p.days.every((d) => selectedDays.includes(d));
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleApplyDayPreset(p.days)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition ${
                          isCurrent
                            ? 'bg-[#8D6E63] text-white border-[#8D6E63]'
                            : 'bg-white text-[#6D4C41] border-[#EADED5] hover:border-[#8D6E63]'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                  {selectedDays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleApplyDayPreset([])}
                      className="text-[10px] px-1.5 py-0.5 text-rose-600 hover:text-rose-800 font-medium hover:underline ml-auto"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 2: TIME PICKER WITH CLOCK DESIGN */}
              <div className="space-y-3 pt-2.5 border-t border-[#EADED5]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#4E342E] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#8D6E63]" /> 2. Select Time (Clock Design)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EADED5] text-[#4E342E]">
                    ⏱️ {durationText}
                  </span>
                </div>

                {/* Start Time vs End Time Selector Tabs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTimeTarget('start');
                      setClockMode('hour');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      activeTimeTarget === 'start'
                        ? 'bg-[#4E342E] text-white border-[#4E342E] shadow-sm'
                        : 'bg-white text-[#6D4C41] border-[#D7CCC8] hover:bg-[#F7F2EF]'
                    }`}
                  >
                    <div
                      className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1 ${
                        activeTimeTarget === 'start' ? 'text-[#D7CCC8]' : 'text-[#8D6E63]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Start Time
                    </div>
                    <div className="text-sm font-extrabold flex items-center justify-between">
                      <span>{formatTime(startTime)}</span>
                      {activeTimeTarget === 'start' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTimeTarget('end');
                      setClockMode('hour');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      activeTimeTarget === 'end'
                        ? 'bg-[#4E342E] text-white border-[#4E342E] shadow-sm'
                        : 'bg-white text-[#6D4C41] border-[#D7CCC8] hover:bg-[#F7F2EF]'
                    }`}
                  >
                    <div
                      className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1 ${
                        activeTimeTarget === 'end' ? 'text-[#D7CCC8]' : 'text-[#8D6E63]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span> End Time
                    </div>
                    <div className="text-sm font-extrabold flex items-center justify-between">
                      <span>{formatTime(endTime)}</span>
                      {activeTimeTarget === 'end' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </button>
                </div>

                {/* Quick Duration Buttons */}
                <div className="flex items-center justify-between bg-white border border-[#EADED5] rounded-xl px-3 py-1.5">
                  <span className="text-[11px] font-bold text-[#4E342E]">Duration:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '45m', mins: 45 },
                      { label: '1 hr', mins: 60 },
                      { label: '1.5 hrs', mins: 90 },
                      { label: '2 hrs', mins: 120 },
                    ].map((d) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => applyDuration(d.mins)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#D7CCC8] bg-[#FAF8F5] text-[#6D4C41] hover:bg-[#4E342E] hover:text-white hover:border-[#4E342E] transition"
                        title={`Set class duration to ${d.label}`}
                      >
                        +{d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clock Dial Container */}
                <div className="bg-white border border-[#EADED5] rounded-2xl p-3 flex flex-col items-center space-y-3 shadow-2xs">
                  {/* Digital Controller Header */}
                  <div className="w-full flex items-center justify-between">
                    {/* Hour / Minute Display Badges */}
                    <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setClockMode('hour')}
                        className={`px-2.5 py-1 rounded-lg text-sm font-extrabold transition ${
                          clockMode === 'hour'
                            ? 'bg-[#4E342E] text-white shadow-xs'
                            : 'text-[#6D4C41] hover:bg-[#EADED5]'
                        }`}
                        title="Click to pick hour"
                      >
                        {currentTime.hour.toString().padStart(2, '0')}
                      </button>
                      <span className="text-base font-black text-[#8D6E63]">:</span>
                      <button
                        type="button"
                        onClick={() => setClockMode('minute')}
                        className={`px-2.5 py-1 rounded-lg text-sm font-extrabold transition ${
                          clockMode === 'minute'
                            ? 'bg-[#4E342E] text-white shadow-xs'
                            : 'text-[#6D4C41] hover:bg-[#EADED5]'
                        }`}
                        title="Click to pick minute"
                      >
                        {currentTime.minute.toString().padStart(2, '0')}
                      </button>
                    </div>

                    {/* Mode Hint */}
                    <div className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-wide">
                      {clockMode === 'hour' ? 'Tap / Drag Hour' : 'Tap / Drag Minute'}
                    </div>

                    {/* AM / PM Toggle Pill */}
                    <div className="flex items-center bg-[#FAF8F5] border border-[#D7CCC8] rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => setCurrentTime((prev) => ({ ...prev, period: 'AM' }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                          currentTime.period === 'AM'
                            ? 'bg-[#4E342E] text-white shadow-xs'
                            : 'text-[#6D4C41] hover:bg-[#EADED5]'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentTime((prev) => ({ ...prev, period: 'PM' }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                          currentTime.period === 'PM'
                            ? 'bg-[#4E342E] text-white shadow-xs'
                            : 'text-[#6D4C41] hover:bg-[#EADED5]'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  {/* VISUAL ANALOG CLOCK FACE (SVG) */}
                  <div className="relative flex items-center justify-center py-1">
                    <svg
                      ref={clockRef}
                      width={clockSize}
                      height={clockSize}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="cursor-pointer select-none touch-none rounded-full shadow-inner bg-[#FAF8F5] border-2 border-[#D7CCC8] hover:border-[#8D6E63] transition-colors"
                    >
                      {/* Clock Dial Ring Accent */}
                      <circle cx={cx} cy={cy} r={radius + 20} fill="none" stroke="#EADED5" strokeWidth="1" />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="none"
                        stroke="#EADED5"
                        strokeDasharray="2 4"
                        strokeWidth="1"
                      />

                      {/* Tick Marks for 12 hours */}
                      {hourMarkers.map((h) => {
                        const angle = (h * 30 - 90) * (Math.PI / 180);
                        const x1 = cx + (radius + 10) * Math.cos(angle);
                        const y1 = cy + (radius + 10) * Math.sin(angle);
                        const x2 = cx + (radius + 16) * Math.cos(angle);
                        const y2 = cy + (radius + 16) * Math.sin(angle);
                        return (
                          <line
                            key={`tick-${h}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#BCAAA4"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            pointerEvents="none"
                          />
                        );
                      })}

                      {/* Clock Pointer Hand */}
                      <line
                        x1={cx}
                        y1={cy}
                        x2={pointerX}
                        y2={pointerY}
                        stroke="#4E342E"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        pointerEvents="none"
                        className="transition-all duration-100 ease-out"
                      />

                      {/* Hand End Circle (Accent Target) */}
                      <circle
                        cx={pointerX}
                        cy={pointerY}
                        r="14"
                        fill="#4E342E"
                        pointerEvents="none"
                        className="transition-all duration-100 ease-out shadow-md"
                      />

                      {/* Center Hub Pivot */}
                      <circle cx={cx} cy={cy} r="4" fill="#4E342E" pointerEvents="none" />
                      <circle cx={cx} cy={cy} r="1.5" fill="#FAF8F5" pointerEvents="none" />

                      {/* Clock Dial Numbers */}
                      {clockMode === 'hour'
                        ? hourMarkers.map((h) => {
                            const angle = (h * 30 - 90) * (Math.PI / 180);
                            const nx = cx + radius * Math.cos(angle);
                            const ny = cy + radius * Math.sin(angle);
                            const isSelected = currentTime.hour === h;

                            return (
                              <text
                                key={`h-${h}`}
                                x={nx}
                                y={ny + 4}
                                textAnchor="middle"
                                pointerEvents="none"
                                className={`text-[11px] font-bold select-none transition-colors ${
                                  isSelected ? 'fill-white font-black' : 'fill-[#4E342E]'
                                }`}
                              >
                                {h}
                              </text>
                            );
                          })
                        : minuteMarkers.map((m) => {
                            const angle = (m * 6 - 90) * (Math.PI / 180);
                            const nx = cx + radius * Math.cos(angle);
                            const ny = cy + radius * Math.sin(angle);
                            const isSelected = currentTime.minute === m;

                            return (
                              <text
                                key={`m-${m}`}
                                x={nx}
                                y={ny + 3.5}
                                textAnchor="middle"
                                pointerEvents="none"
                                className={`text-[10px] font-bold select-none transition-colors ${
                                  isSelected ? 'fill-white font-black' : 'fill-[#4E342E]'
                                }`}
                              >
                                {m.toString().padStart(2, '0')}
                              </text>
                            );
                          })}
                    </svg>
                  </div>

                  {/* Steppers & Switch Controls */}
                  <div className="w-full flex items-center justify-between pt-1 border-t border-[#F5F0EB]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustMinutes(-15)}
                        className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#D7CCC8] hover:bg-[#EADED5] text-[10px] font-bold text-[#6D4C41] transition"
                        title="Subtract 15 minutes"
                      >
                        -15m
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustMinutes(-5)}
                        className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#D7CCC8] hover:bg-[#EADED5] text-[10px] font-bold text-[#6D4C41] transition"
                        title="Subtract 5 minutes"
                      >
                        -5m
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustMinutes(5)}
                        className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#D7CCC8] hover:bg-[#EADED5] text-[10px] font-bold text-[#6D4C41] transition"
                        title="Add 5 minutes"
                      >
                        +5m
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustMinutes(15)}
                        className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#D7CCC8] hover:bg-[#EADED5] text-[10px] font-bold text-[#6D4C41] transition"
                        title="Add 15 minutes"
                      >
                        +15m
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setClockMode(clockMode === 'hour' ? 'minute' : 'hour')}
                        className="text-[10px] font-bold text-[#8D6E63] hover:text-[#4E342E] bg-[#FAF8F5] px-2 py-1 rounded-lg border border-[#D7CCC8] transition"
                      >
                        Switch to {clockMode === 'hour' ? 'Minutes' : 'Hours'}
                      </button>
                    </div>
                  </div>

                  {/* Forward / Backward Navigation between Start Time and End Time */}
                  <div className="w-full pt-1 border-t border-[#F5F0EB]">
                    {activeTimeTarget === 'start' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTimeTarget('end');
                          setClockMode('hour');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#EADED5] text-[#4E342E] font-bold text-xs transition border border-[#D7CCC8]"
                      >
                        <span>Next: Set End Time ({formatTime(endTime)})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTimeTarget('start');
                          setClockMode('hour');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#EADED5] text-[#4E342E] font-bold text-xs transition border border-[#D7CCC8]"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Start Time ({formatTime(startTime)})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Common Tuition Slot Quick Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-[#8D6E63] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#A1887F]" /> Quick Tuition Slot Presets:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {COMMON_TIME_SLOTS.map((slot) => {
                      const isMatch =
                        startTime.hour === slot.startH &&
                        startTime.minute === slot.startM &&
                        startTime.period === slot.startP &&
                        endTime.hour === slot.endH &&
                        endTime.minute === slot.endM &&
                        endTime.period === slot.endP;

                      return (
                        <button
                          key={slot.label}
                          type="button"
                          onClick={() => applyTimeSlotPreset(slot)}
                          className={`text-[10px] text-left px-2 py-1.5 rounded-xl border font-medium transition leading-snug ${
                            isMatch
                              ? 'bg-[#4E342E] text-white border-[#4E342E] shadow-xs'
                              : 'bg-white text-[#6D4C41] border-[#EADED5] hover:border-[#8D6E63] hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="font-bold">
                            {slot.startH}:{slot.startM.toString().padStart(2, '0')} {slot.startP} - {slot.endH}:
                            {slot.endM.toString().padStart(2, '0')} {slot.endP}
                          </div>
                          <div className={`text-[9px] ${isMatch ? 'text-[#D7CCC8]' : 'text-[#8D6E63]'}`}>
                            {slot.label.split('(')[1]?.replace(')', '') || ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
