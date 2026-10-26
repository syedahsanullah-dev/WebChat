'use client';

import React, { createContext, useContext } from 'react';
import {
  useCallSignaling,
  CallState,
  ActiveCallData,
} from '@/hooks/useCallSignaling';
import OutgoingCallModal from '@/components/call/OutgoingCallModal';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import ActiveCallBar from '@/components/call/ActiveCallBar';

export interface CallContextValue {
  callState: CallState;
  callData: ActiveCallData | null;
  callDuration: number;
  isMuted: boolean;
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

  const isOutgoing =
    call.callState === 'outgoing_calling' ||
    call.callState === 'outgoing_ringing';
  const isIncoming = call.callState === 'incoming_ringing';
  const isConnected =
    call.callState === 'connecting' || call.callState === 'connected';

  const partner = call.callData
    ? call.callData.isCaller
      ? call.callData.receiver
      : call.callData.caller
    : null;

  return (
    <CallContext.Provider value={call}>
      {/* Active Call Floating / Docked Bar */}
      <ActiveCallBar
        isVisible={isConnected}
        participant={partner}
        durationSeconds={call.callDuration}
        isMuted={call.isMuted}
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
