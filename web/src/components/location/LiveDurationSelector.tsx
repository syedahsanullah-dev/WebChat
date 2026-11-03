'use client';

import React, { useState } from 'react';
import { Clock, Shield, ArrowRight, Radio } from 'lucide-react';

export interface LiveDurationSelectorProps {
  onConfirm: (durationMinutes: number, comment?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function LiveDurationSelector({
  onConfirm,
  onCancel,
  isLoading = false,
}: LiveDurationSelectorProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [comment, setComment] = useState<string>('');

  const durations = [
    { label: '15 Minutes', value: 15, subtext: 'Quick meetups' },
    { label: '1 Hour', value: 60, subtext: 'Commutes & events (Recommended)' },
    { label: '8 Hours', value: 480, subtext: 'Full-day trips' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selectedDuration, comment.trim() || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between p-5 space-y-4">
      <div className="space-y-4">
        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-[#00a884] flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Share Live Location
            </h3>
            <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Continuous GPS streaming with battery-friendly 8s throttling
            </p>
          </div>
        </div>

        {/* Duration Selection Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Select Sharing Duration</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {durations.map((d) => {
              const isSelected = selectedDuration === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDuration(d.value)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-[#00a884]/15 border-[#00a884] text-[#00a884] shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 border-transparent text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="text-xs font-bold">{d.label}</span>
                  <span className="text-[10px] opacity-75 truncate max-w-full">
                    {d.subtext.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment Input */}
        <div>
          <label className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
            Comment (Optional)
          </label>
          <input
            type="text"
            value={comment}
            maxLength={150}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. On my way home, arriving soon"
            className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted focus:outline-hidden focus:border-[#00a884] transition-colors"
          />
        </div>

    
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t border-[#e9edef] dark:border-white/10">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] active:bg-[#007f61] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <span>{isLoading ? 'Starting...' : 'Share Live Location'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
