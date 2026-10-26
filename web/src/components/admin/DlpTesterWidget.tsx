'use client';

import React, { useState } from 'react';
import { Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { scanMessageContent } from '@/lib/dlpPatterns';
import { DlpRule } from './DlpRulesTable';

interface DlpTesterWidgetProps {
  rules: DlpRule[];
}

export default function DlpTesterWidget({ rules }: DlpTesterWidgetProps) {
  const [testText, setTestText] = useState(
    'Config snippet: AWS_KEY=AKIAIOSFODNN7EXAMPLE\nTesting secret credentials leak.'
  );

  const scanResult = scanMessageContent(testText, rules);

  return (
    <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-[#00a884]" />
          <h3 className="font-semibold text-xs text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Interactive DLP Regex Sandbox &amp; Tester
          </h3>
        </div>
        <span className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          In-Memory Simulation (&lt; 1ms)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
            Test Payload String (Paste text to simulate)
          </label>
          <textarea
            rows={4}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Type or paste text to test against current DLP patterns..."
            className="w-full font-mono text-xs p-3 rounded-lg bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:border-[#00a884] resize-none"
          />
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <label className="block text-[11px] font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
              Real-Time Scan Outcome
            </label>
            <div className="p-3 rounded-lg border border-[#e9edef] dark:border-white/10 bg-[#f0f2f5] dark:bg-[#111b21] min-h-[96px] flex flex-col justify-center">
              {scanResult.isBlocked ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>BLOCKED: DLP Policy Violation Triggered</span>
                  </div>
                  <div className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                    Matched Rule:{' '}
                    <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                      {scanResult.matchedRule?.name}
                    </span>{' '}
                    ({scanResult.matchedRule?.category})
                  </div>
                  <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded inline-block">
                    Detected Leak: {scanResult.matchedSnippet}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  <span>CLEAN: No sensitive credentials or card patterns matched</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Quick Test Presets:
            </span>
            <button
              type="button"
              onClick={() => setTestText('AWS_SECRET=AKIAIOSFODNN7EXAMPLE')}
              className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[10px] text-wa-light-text-primary dark:text-wa-dark-text-primary font-mono transition-colors"
            >
              AWS Key
            </button>
            <button
              type="button"
              onClick={() =>
                setTestText('-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----')
              }
              className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[10px] text-wa-light-text-primary dark:text-wa-dark-text-primary font-mono transition-colors"
            >
              SSH Key
            </button>
            <button
              type="button"
              onClick={() => setTestText('My SSN is 000-12-3456')}
              className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[10px] text-wa-light-text-primary dark:text-wa-dark-text-primary font-mono transition-colors"
            >
              SSN
            </button>
            <button
              type="button"
              onClick={() => setTestText('Safe message: Hello team, meeting at 3pm!')}
              className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[10px] text-wa-light-text-primary dark:text-wa-dark-text-primary font-mono transition-colors"
            >
              Safe Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
