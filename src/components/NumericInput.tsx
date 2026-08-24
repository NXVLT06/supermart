import React, { useState, useEffect, useRef } from 'react';

interface NumericInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  color?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'red' | 'blue';
  onChange: (value: number) => void;
}

const colorMap = {
  cyan: {
    track: 'accent-cyan-400',
    border: 'border-cyan-500/50 focus:border-cyan-400',
    text: 'text-cyan-300',
    ring: 'focus:ring-cyan-500/30',
    badge: 'bg-cyan-500/10 text-cyan-300',
  },
  purple: {
    track: 'accent-purple-400',
    border: 'border-purple-500/50 focus:border-purple-400',
    text: 'text-purple-300',
    ring: 'focus:ring-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-300',
  },
  emerald: {
    track: 'accent-emerald-400',
    border: 'border-emerald-500/50 focus:border-emerald-400',
    text: 'text-emerald-300',
    ring: 'focus:ring-emerald-500/30',
    badge: 'bg-emerald-500/10 text-emerald-300',
  },
  amber: {
    track: 'accent-amber-400',
    border: 'border-amber-500/50 focus:border-amber-400',
    text: 'text-amber-300',
    ring: 'focus:ring-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-300',
  },
  red: {
    track: 'accent-red-400',
    border: 'border-red-500/50 focus:border-red-400',
    text: 'text-red-300',
    ring: 'focus:ring-red-500/30',
    badge: 'bg-red-500/10 text-red-300',
  },
  blue: {
    track: 'accent-blue-400',
    border: 'border-blue-500/50 focus:border-blue-400',
    text: 'text-blue-300',
    ring: 'focus:ring-blue-500/30',
    badge: 'bg-blue-500/10 text-blue-300',
  },
};

export const NumericInput: React.FC<NumericInputProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  color = 'cyan',
  onChange,
}) => {
  const c = colorMap[color];
  const [rawText, setRawText] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const prevValueRef = useRef(value);

  // Sync display when value changes from outside (slider) but input not focused
  useEffect(() => {
    if (!isFocused && value !== prevValueRef.current) {
      setRawText(value.toString());
      prevValueRef.current = value;
    }
  }, [value, isFocused]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawText(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      const clamped = clamp(parsed);
      prevValueRef.current = clamped;
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(rawText);
    if (isNaN(parsed)) {
      setRawText(value.toString());
    } else {
      const clamped = clamp(parsed);
      setRawText(clamped.toString());
      prevValueRef.current = clamped;
      onChange(clamped);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    prevValueRef.current = v;
    setRawText(v.toString());
    onChange(v);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={isFocused ? rawText : value}
            onChange={handleTextChange}
            onFocus={() => { setIsFocused(true); setRawText(value.toString()); }}
            onBlur={handleBlur}
            className={`
              w-24 px-2 py-0.5 rounded-md text-xs font-mono font-semibold
              bg-slate-900/80 border ${c.border} ${c.text} ${c.ring}
              focus:outline-none focus:ring-2
              transition-all duration-150
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            `}
          />
          {unit && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c.badge} font-semibold`}>
              {unit}
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className={`w-full h-1.5 rounded-full cursor-pointer ${c.track}`}
      />
      <div className="flex justify-between text-[10px] text-slate-600 font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default NumericInput;
