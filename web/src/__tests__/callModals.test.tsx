import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OutgoingCallModal from '@/components/call/OutgoingCallModal';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import ActiveCallBar from '@/components/call/ActiveCallBar';

describe('Phase 43: Voice Call UI Components (Modals & ActiveCallBar)', () => {
  describe('1. OutgoingCallModal Component', () => {
    const mockRecipient = {
      id: 'bob-123',
      name: 'Bob Dylan',
      username: 'bob',
      avatar: null,
    };

    it('renders recipient name, username, calling badge, and cryptographic wording', () => {
      render(
        <OutgoingCallModal
          isOpen={true}
          recipient={mockRecipient}
          callState="outgoing_calling"
          onEndCall={vi.fn()}
        />
      );

      expect(screen.getByText('Bob Dylan')).toBeDefined();
      expect(screen.getByText('@bob')).toBeDefined();
      expect(screen.getByText('Calling...')).toBeDefined();
      expect(screen.getByText('Direct Encrypted Voice Call (P2P)')).toBeDefined();
    });

    it('updates badge to "Ringing..." when callState is outgoing_ringing', () => {
      render(
        <OutgoingCallModal
          isOpen={true}
          recipient={mockRecipient}
          callState="outgoing_ringing"
          onEndCall={vi.fn()}
        />
      );

      expect(screen.getByText('Ringing...')).toBeDefined();
    });

    it('invokes onEndCall when clicking the red hangup button', () => {
      const onEndCall = vi.fn();
      render(
        <OutgoingCallModal
          isOpen={true}
          recipient={mockRecipient}
          callState="outgoing_calling"
          onEndCall={onEndCall}
        />
      );

      const endButton = screen.getByLabelText('End call');
      fireEvent.click(endButton);
      expect(onEndCall).toHaveBeenCalledTimes(1);
    });

    it('returns null when isOpen is false', () => {
      const { container } = render(
        <OutgoingCallModal
          isOpen={false}
          recipient={mockRecipient}
          callState="outgoing_calling"
          onEndCall={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('2. IncomingCallModal Component', () => {
    const mockCaller = {
      id: 'alice-456',
      name: 'Alice Cooper',
      username: 'alice',
      avatar: null,
    };

    it('renders caller information and incoming call status', () => {
      render(
        <IncomingCallModal
          isOpen={true}
          caller={mockCaller}
          onAccept={vi.fn()}
          onDecline={vi.fn()}
        />
      );

      expect(screen.getByText('Alice Cooper')).toBeDefined();
      expect(screen.getByText('@alice')).toBeDefined();
      expect(screen.getByText('Incoming WebChat Voice Call...')).toBeDefined();
      expect(screen.getByText('Direct Encrypted Voice Call (P2P)')).toBeDefined();
    });

    it('invokes onAccept when tapping green Accept button', () => {
      const onAccept = vi.fn();
      render(
        <IncomingCallModal
          isOpen={true}
          caller={mockCaller}
          onAccept={onAccept}
          onDecline={vi.fn()}
        />
      );

      const acceptButton = screen.getByLabelText('Accept call');
      fireEvent.click(acceptButton);
      expect(onAccept).toHaveBeenCalledTimes(1);
    });

    it('invokes onDecline when tapping red Decline button', () => {
      const onDecline = vi.fn();
      render(
        <IncomingCallModal
          isOpen={true}
          caller={mockCaller}
          onAccept={vi.fn()}
          onDecline={onDecline}
        />
      );

      const declineButton = screen.getByLabelText('Decline call');
      fireEvent.click(declineButton);
      expect(onDecline).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. ActiveCallBar Component', () => {
    const mockParticipant = {
      id: 'peer-789',
      name: 'David Bowie',
      username: 'bowie',
      avatar: null,
    };

    it('formats duration into mm:ss and displays P2P Encrypted (DTLS)', () => {
      render(
        <ActiveCallBar
          isVisible={true}
          participant={mockParticipant}
          durationSeconds={125} // 02:05
          isMuted={false}
          remoteVolume={0}
          audioDevices={[]}
          selectedOutputDevice=""
          onToggleMute={vi.fn()}
          onSwitchOutputDevice={vi.fn()}
          onEndCall={vi.fn()}
        />
      );

      expect(screen.getByText('David Bowie')).toBeDefined();
      expect(screen.getByText('02:05')).toBeDefined();
      expect(screen.getByText('VOICE CALL')).toBeDefined();
      expect(screen.getByText('P2P Encrypted (DTLS)')).toBeDefined();
    });

    it('formats duration exceeding 1 hour into hh:mm:ss', () => {
      render(
        <ActiveCallBar
          isVisible={true}
          participant={mockParticipant}
          durationSeconds={3665} // 01:01:05
          isMuted={false}
          remoteVolume={0}
          audioDevices={[]}
          selectedOutputDevice=""
          onToggleMute={vi.fn()}
          onSwitchOutputDevice={vi.fn()}
          onEndCall={vi.fn()}
        />
      );

      expect(screen.getByText('01:01:05')).toBeDefined();
    });

    it('displays remote muted badge when peer is muted', () => {
      render(
        <ActiveCallBar
          isVisible={true}
          participant={mockParticipant}
          durationSeconds={20}
          isMuted={false}
          isRemoteMuted={true}
          remoteVolume={0}
          audioDevices={[]}
          selectedOutputDevice=""
          onToggleMute={vi.fn()}
          onSwitchOutputDevice={vi.fn()}
          onEndCall={vi.fn()}
        />
      );

      expect(screen.getByText('Muted')).toBeDefined();
    });

    it('displays animated reconnecting badge when callState is reconnecting', () => {
      render(
        <ActiveCallBar
          isVisible={true}
          participant={mockParticipant}
          durationSeconds={20}
          callState="reconnecting"
          isMuted={false}
          remoteVolume={0}
          audioDevices={[]}
          selectedOutputDevice=""
          onToggleMute={vi.fn()}
          onSwitchOutputDevice={vi.fn()}
          onEndCall={vi.fn()}
        />
      );

      expect(screen.getByText('Reconnecting...')).toBeDefined();
    });

    it('triggers onToggleMute and onEndCall handlers', () => {
      const onToggleMute = vi.fn();
      const onEndCall = vi.fn();

      render(
        <ActiveCallBar
          isVisible={true}
          participant={mockParticipant}
          durationSeconds={30}
          isMuted={false}
          remoteVolume={0}
          audioDevices={[]}
          selectedOutputDevice=""
          onToggleMute={onToggleMute}
          onSwitchOutputDevice={vi.fn()}
          onEndCall={onEndCall}
        />
      );

      const muteButton = screen.getByTitle('Mute microphone');
      fireEvent.click(muteButton);
      expect(onToggleMute).toHaveBeenCalledTimes(1);

      const endButton = screen.getByTitle('End call');
      fireEvent.click(endButton);
      expect(onEndCall).toHaveBeenCalledTimes(1);
    });
  });
});
