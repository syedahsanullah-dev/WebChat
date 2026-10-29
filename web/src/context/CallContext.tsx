'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  useCallSignaling,
  CallState,
  ActiveCallData,
} from '@/hooks/useCallSignaling';
import OutgoingCallModal from '@/components/call/OutgoingCallModal';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import ActiveCallBar from '@/components/call/ActiveCallBar';
import { ToastContainer } from '@/components/ui/Toast';
import { initSilentAudioUnlock } from '@/lib/audio';
import { Volume2 } from 'lucide-react';

export interface CallContextValue {
  callState: CallState;
  callData: ActiveCallData | null;
  callDuration: number;
  isMuted: boolean;
  isRemoteMuted: boolean;
  isAudioConnected: boolean;
  remoteVolume: number;
  audioDevices: MediaDeviceInfo[];
  selectedOutputDevice: string;
  startCall: (params: {
    chatId: string;
    recipientId: string;
    recipientName: string;
    recipientUsername?: string;
    recipientAvatar?: string | null;
  }) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: (reason?: string) => void;
  toggleMute: () => void;
  switchOutputDevice: (deviceId: string) => Promise<boolean>;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const call = useCallSignaling();
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const autoAcceptHandledRef = useRef<string | null>(null);

  // Phase 40: Silent audio unlock pattern for mobile browser autoplay policies
  useEffect(() => {
    const cleanup = initSilentAudioUnlock();
    return cleanup;
  }, []);

  // Phase 40: Listen for browser autoplay blocked events
  useEffect(() => {
    const handleAutoplayBlocked = () => {
      setIsAutoplayBlocked(true);
    };
    window.addEventListener('webchat:autoplay-blocked', handleAutoplayBlocked);
    return () => {
      window.removeEventListener('webchat:autoplay-blocked', handleAutoplayBlocked);
    };
  }, []);

  // Phase 40: Auto-accept call if opened via Service Worker "Accept" notification action
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (call.callState === 'incoming_ringing' && call.callData?.callId) {
      const params = new URLSearchParams(window.location.search);
      const autoAcceptCallId = params.get('autoAcceptCall');
      if (
        autoAcceptCallId &&
        autoAcceptCallId === call.callData.callId &&
        autoAcceptHandledRef.current !== autoAcceptCallId
      ) {
        autoAcceptHandledRef.current = autoAcceptCallId;
        // Clean URL parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('autoAcceptCall');
        window.history.replaceState({}, '', newUrl.toString());

        call.acceptCall().catch((err) => {
          console.warn('[CallContext] Auto-accept call failed:', err);
        });
      }
    }
  }, [call.callState, call.callData, call]);

  const isOutgoing =
    call.callState === 'outgoing_calling' ||
    call.callState === 'outgoing_ringing';
  const isIncoming = call.callState === 'incoming_ringing';
  const isConnected =
    call.callState === 'connecting' ||
    call.callState === 'connected' ||
    call.callState === 'reconnecting';

  const partner = call.callData
    ? call.callData.isCaller
      ? call.callData.receiver
      : call.callData.caller
    : null;

  return (
    <CallContext.Provider value={call}>
      {/* Permanent DOM Audio Element for Mobile Chrome & WebRTC Playback */}
      <audio id="webchat-remote-audio" autoPlay playsInline className="hidden" aria-hidden="true" />

      {/* Accessible Non-Blocking Toast Container */}
      <ToastContainer />

      {/* Phase 40: Pulsating Autoplay Recovery Banner */}
      {isAutoplayBlocked && isConnected && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('webchat-remote-audio') as HTMLAudioElement;
              if (el) {
                el.play()
                  .then(() => setIsAutoplayBlocked(false))
                  .catch(() => {});
              } else {
                setIsAutoplayBlocked(false);
              }
            }}
            className="px-4 py-2.5 bg-wa-green hover:bg-wa-green/90 text-white font-semibold rounded-full shadow-lg flex items-center gap-2 text-xs sm:text-sm cursor-pointer transition-transform active:scale-95"
          >
            <Volume2 className="w-4 h-4" />
            <span>Tap to Unmute Call Audio</span>
          </button>
        </div>
      )}

      {/* Active Call Floating / Docked Bar */}
      <ActiveCallBar
        isVisible={isConnected}
        participant={partner}
        durationSeconds={call.callDuration}
        callState={call.callState}
        isMuted={call.isMuted}
        isRemoteMuted={call.isRemoteMuted}
        remoteVolume={call.remoteVolume}
        audioDevices={call.audioDevices}
        selectedOutputDevice={call.selectedOutputDevice}
        onToggleMute={call.toggleMute}
        onSwitchOutputDevice={call.switchOutputDevice}
        onEndCall={call.endCall}
      />

      {children}

      {/* Outgoing Calling / Ringing Modal */}
      <OutgoingCallModal
        isOpen={isOutgoing}
        recipient={call.callData?.receiver || null}
        callState={call.callState}
        onEndCall={call.endCall}
      />

      {/* Incoming Ringing Modal */}
      <IncomingCallModal
        isOpen={isIncoming}
        caller={call.callData?.caller || null}
        onAccept={call.acceptCall}
        onDecline={() => call.rejectCall('declined')}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
