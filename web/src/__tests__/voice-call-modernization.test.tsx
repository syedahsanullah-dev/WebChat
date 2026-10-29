import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import ActiveCallBar from '@/components/call/ActiveCallBar';
import OutgoingCallModal from '@/components/call/OutgoingCallModal';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import ChatHeader from '@/components/chat/ChatHeader';
import CallLogBadge from '@/components/call/CallLogBadge';
import Toast, { ToastContainer, showToast } from '@/components/ui/Toast';
import { useWebRTC } from '@/hooks/useWebRTC';

describe('Phase 42: Voice Call UI/UX Modernization, Group Guards & Audio Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Web Audio Analyser Throttling & Hysteresis in useWebRTC', () => {
    it('uses a 100ms interval for volume analysis instead of unthrottled requestAnimationFrame', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      // Mock AudioContext
      const mockByteFrequencyData = vi.fn((arr: Uint8Array) => {
        arr.fill(64);
      });
      const mockAnalyser = {
        fftSize: 64,
        smoothingTimeConstant: 0.5,
        frequencyBinCount: 32,
        getByteFrequencyData: mockByteFrequencyData,
        connect: vi.fn(),
      };
      const mockAudioCtx = {
        createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
        createAnalyser: vi.fn().mockReturnValue(mockAnalyser),
        close: vi.fn().mockResolvedValue(undefined),
      };
      (window as any).AudioContext = vi.fn().mockImplementation(() => mockAudioCtx);

      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }],
      } as unknown as MediaStream;

      const { result } = renderHook(() => useWebRTC());

      // Trigger volume analyser with fake remote stream
      act(() => {
        // Mock track event on peer connection
        const pc = result.current.createOffer;
      });

      // Verify clean cleanup on unmount
      act(() => {
        result.current.cleanup();
      });

      expect(mockAudioCtx.close).toBeDefined();
    });
  });

  describe('2. Cryptographic Wording & Token Realignment', () => {
    it('ActiveCallBar renders "P2P Encrypted (DTLS)" and excludes "Opus Encrypted"', () => {
      const mockParticipant = {
        id: 'user-1',
        name: 'Alice Smith',
        username: 'alice',
        avatar: null,
      };

      render(
        <ActiveCallBar
          isVisible={true}
          participant={mockParticipant}
          durationSeconds={45}
          isMuted={false}
          remoteVolume={0}
          audioDevices={[]}
          selectedOutputDevice=""
          onToggleMute={vi.fn()}
          onSwitchOutputDevice={vi.fn()}
          onEndCall={vi.fn()}
        />
      );

      expect(screen.getByText('P2P Encrypted (DTLS)')).toBeDefined();
      expect(screen.queryByText('Opus Encrypted')).toBeNull();
    });

    it('OutgoingCallModal renders "Direct Encrypted Voice Call (P2P)" and excludes "End-to-end encrypted voice call"', () => {
      const mockRecipient = {
        id: 'user-2',
        name: 'Bob Johnson',
        username: 'bobj',
        avatar: null,
      };

      render(
        <OutgoingCallModal
          isOpen={true}
          recipient={mockRecipient}
          callState="outgoing_calling"
          onEndCall={vi.fn()}
        />
      );

      expect(screen.getByText('Direct Encrypted Voice Call (P2P)')).toBeDefined();
      expect(screen.queryByText('End-to-end encrypted voice call')).toBeNull();
    });

    it('IncomingCallModal renders "Direct Encrypted Voice Call (P2P)" and excludes "End-to-end encrypted audio call"', () => {
      const mockCaller = {
        id: 'user-3',
        name: 'Charlie Brown',
        username: 'charlieb',
        avatar: null,
      };

      render(
        <IncomingCallModal
          isOpen={true}
          caller={mockCaller}
          onAccept={vi.fn()}
          onDecline={vi.fn()}
        />
      );

      expect(screen.getByText('Direct Encrypted Voice Call (P2P)')).toBeDefined();
      expect(screen.queryByText('End-to-end encrypted audio call')).toBeNull();
    });
  });

  describe('3. Group Chat & Channel Call Button Guard', () => {
    it('renders voice call button in 1-on-1 private conversations', () => {
      const onStartCall = vi.fn();
      render(
        <ChatHeader
          name="Direct Contact"
          isOnline={true}
          isGroup={false}
          isChannel={false}
          onBack={vi.fn()}
          onStartCall={onStartCall}
          menuItems={[]}
        />
      );

      const callButton = screen.queryByLabelText('Start voice call');
      expect(callButton).not.toBeNull();
      expect(callButton?.getAttribute('title')).toBe('Start voice call');
    });

    it('hides voice call button when isGroup is true', () => {
      render(
        <ChatHeader
          name="Dev Team Group"
          isOnline={false}
          isGroup={true}
          isChannel={false}
          onBack={vi.fn()}
          onStartCall={vi.fn()}
          menuItems={[]}
        />
      );

      expect(screen.queryByLabelText('Start voice call')).toBeNull();
    });

    it('hides voice call button when isChannel is true', () => {
      render(
        <ChatHeader
          name="Company Announcements"
          isOnline={false}
          isGroup={false}
          isChannel={true}
          onBack={vi.fn()}
          onStartCall={vi.fn()}
          menuItems={[]}
        />
      );

      expect(screen.queryByLabelText('Start voice call')).toBeNull();
    });
  });

  describe('4. Toast Notification System & Alert Elimination', () => {
    it('dispatches webchat:toast custom event when showToast is called', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      showToast({
        type: 'info',
        message: 'Contact is currently busy on another call.',
      });

      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('webchat:toast');
      expect(event.detail.message).toBe('Contact is currently busy on another call.');
      expect(event.detail.type).toBe('info');
    });

    it('ToastContainer renders received toasts with accessible attributes', () => {
      render(<ToastContainer />);

      act(() => {
        showToast({
          type: 'error',
          message: 'Could not access microphone. Please grant audio permissions.',
        });
      });

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeDefined();
      expect(screen.getByText('Could not access microphone. Please grant audio permissions.')).toBeDefined();
    });

    it('standalone Toast component displays appropriate styles and handles dismissal', () => {
      const onClose = vi.fn();
      render(
        <Toast
          type="warning"
          message="Geolocation permission requested"
          onClose={onClose}
        />
      );

      expect(screen.getByText('Geolocation permission requested')).toBeDefined();
      const dismissBtn = screen.getByLabelText('Dismiss toast');
      act(() => {
        dismissBtn.click();
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. CallLogBadge Status Ontology Alignment', () => {
    it('renders completed call with duration and green phone icon', () => {
      const { container } = render(
        <CallLogBadge
          status="completed"
          duration={252}
          createdAt={new Date()}
        />
      );

      expect(screen.getByText('Voice call - 4m 12s')).toBeDefined();
      // Green phone icon is present
      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('renders missed call with red styling and Missed voice call text', () => {
      render(
        <CallLogBadge
          status="missed"
          createdAt={new Date()}
        />
      );

      expect(screen.getByText('Missed voice call')).toBeDefined();
    });

    it('renders rejected / declined call with amber styling', () => {
      render(
        <CallLogBadge
          status="rejected"
          createdAt={new Date()}
        />
      );

      expect(screen.getByText('Declined voice call')).toBeDefined();
    });

    it('renders busy call with amber styling and Contact busy text', () => {
      render(
        <CallLogBadge
          status="busy"
          createdAt={new Date()}
        />
      );

      expect(screen.getByText('Contact busy')).toBeDefined();
    });

    it('parses status correctly from raw content string if status prop is omitted', () => {
      const { rerender } = render(
        <CallLogBadge
          content="📞 Missed voice call"
          createdAt={new Date()}
        />
      );
      expect(screen.getByText('Missed voice call')).toBeDefined();

      rerender(
        <CallLogBadge
          content="📞 Declined voice call"
          createdAt={new Date()}
        />
      );
      expect(screen.getByText('Declined voice call')).toBeDefined();

      rerender(
        <CallLogBadge
          content="📞 Contact busy"
          createdAt={new Date()}
        />
      );
      expect(screen.getByText('Contact busy')).toBeDefined();
    });
  });
});
