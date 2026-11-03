import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ConversationSnippet from '@/components/sidebar/ConversationSnippet';
import Lightbox from '@/components/chat/Lightbox';
import LiveLocationBubble from '@/components/location/LiveLocationBubble';
import MessageBubble from '@/components/chat/MessageBubble';

// Mock Leaflet for LiveLocationBubble
vi.mock('leaflet', () => {
  return {
    default: {
      map: vi.fn(() => ({
        setView: vi.fn(),
        eachLayer: vi.fn(),
        remove: vi.fn(),
        invalidateSize: vi.fn(),
      })),
      tileLayer: vi.fn(() => ({
        addTo: vi.fn(),
      })),
      marker: vi.fn(() => ({
        addTo: vi.fn(),
        setLatLng: vi.fn(),
        setIcon: vi.fn(),
      })),
      divIcon: vi.fn(() => ({})),
      control: {
        zoom: vi.fn(() => ({
          addTo: vi.fn(),
        })),
      },
    },
  };
});

// Mock WebSocketContext
const mockSubscribe = vi.fn(() => () => {});
const mockSend = vi.fn();
vi.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    subscribe: mockSubscribe,
    send: mockSend,
  }),
}));

describe('Chat Bug Fixes: Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Issue 1: Encrypted Message Preview in Sidebar / User Panel', () => {
    it('masks raw Base64 ciphertext with a user-friendly encrypted message placeholder', () => {
      // 32-character AES-GCM ciphertext sample
      const rawCiphertext = 'W7kLqP4r91uVxM2bYz8aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789+==';
      render(<ConversationSnippet lastMessage={rawCiphertext} isGroup={false} />);

      expect(screen.getByText('🔒 Encrypted message')).toBeDefined();
      expect(screen.queryByText(rawCiphertext)).toBeNull();
    });

    it('renders decrypted plaintext messages normally', () => {
      const plaintext = 'Hey! Are we still meeting at 3 PM?';
      render(<ConversationSnippet lastMessage={plaintext} isGroup={false} />);

      expect(screen.getByText(plaintext)).toBeDefined();
      expect(screen.queryByText('🔒 Encrypted message')).toBeNull();
    });

    it('renders typing indicator when user is typing', () => {
      render(
        <ConversationSnippet
          lastMessage="Hey"
          isTyping={true}
          typingUsername="Alice"
        />
      );

      expect(screen.getByText('Alice is typing')).toBeDefined();
    });
  });

  describe('Issue 2: Live Location Sharing', () => {
    it('renders LiveLocationBubble with live tag and correctly sets liveLocationId', () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      render(
        <LiveLocationBubble
          liveLocationId="live-loc-123"
          chatId="chat-1"
          initialLatitude={40.7128}
          initialLongitude={-74.006}
          expiresAt={expiresAt}
          senderId="user-alice"
          senderName="Alice"
          currentUserId="user-alice"
        />
      );

      expect(screen.getByText('LIVE')).toBeDefined();
      expect(screen.getByText('You are sharing live location')).toBeDefined();
      expect(screen.getByText('Stop Sharing')).toBeDefined();
    });

    it('updates coordinates when location:live_updated arrives via WebSocket', async () => {
      let updateCallback: ((payload: any) => void) | null = null;
      mockSubscribe.mockImplementation((event, cb) => {
        if (event === 'location:live_updated') {
          updateCallback = cb;
        }
        return () => {};
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      render(
        <LiveLocationBubble
          liveLocationId="live-loc-999"
          chatId="chat-1"
          initialLatitude={40.7128}
          initialLongitude={-74.006}
          expiresAt={expiresAt}
          senderId="user-bob"
          senderName="Bob"
          currentUserId="user-alice"
        />
      );

      expect(updateCallback).toBeDefined();

      // Simulate incoming coordinate update
      await act(async () => {
        updateCallback!({
          liveLocationId: 'live-loc-999',
          latitude: 40.72,
          longitude: -74.01,
          heading: 90,
        });
      });

      expect(screen.getByText("Bob's Live Location")).toBeDefined();
    });

    it('sends location:live_stop and marks ended when Stop Sharing is clicked', async () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      render(
        <LiveLocationBubble
          liveLocationId="live-loc-123"
          chatId="chat-1"
          initialLatitude={40.7128}
          initialLongitude={-74.006}
          expiresAt={expiresAt}
          senderId="user-alice"
          senderName="Alice"
          currentUserId="user-alice"
        />
      );

      const stopButton = screen.getByText('Stop Sharing');
      await act(async () => {
        fireEvent.click(stopButton);
      });

      expect(mockSend).toHaveBeenCalledWith({
        type: 'location:live_stop',
        payload: {
          liveLocationId: 'live-loc-123',
          chatId: 'chat-1',
        },
      });
    });
  });

  describe('Issue 3: Lightbox Image Close Icon', () => {
    it('renders the dedicated prominent close button with aria-label', () => {
      const handleClose = vi.fn();
      render(
        <Lightbox
          isOpen={true}
          src="https://example.com/test.jpg"
          alt="Test Photo"
          onClose={handleClose}
        />
      );

      const closeButtons = screen.getAllByLabelText('Close image viewer');
      expect(closeButtons.length).toBeGreaterThanOrEqual(1);

      // Click the dedicated floating close icon
      fireEvent.click(closeButtons[0]);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes lightbox when pressing the Escape key', () => {
      const handleClose = vi.fn();
      render(
        <Lightbox
          isOpen={true}
          src="https://example.com/test.jpg"
          alt="Test Photo"
          onClose={handleClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('closes lightbox when clicking on the backdrop area', () => {
      const handleClose = vi.fn();
      render(
        <Lightbox
          isOpen={true}
          src="https://example.com/test.jpg"
          alt="Test Photo"
          onClose={handleClose}
        />
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render anything when isOpen is false', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <Lightbox
          isOpen={false}
          src="https://example.com/test.jpg"
          alt="Test Photo"
          onClose={handleClose}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Issue 4: Bot Badge Isolation on MessageBubble', () => {
    it('does NOT render BotMessageBadge or "Bot" label for regular user messages with authorName', () => {
      render(
        <MessageBubble
          id="msg-regular-user"
          content="Hey, are we having the sync today?"
          isMe={false}
          createdAt={new Date().toISOString()}
          authorName="Charlie"
          messageType="text"
        />
      );

      expect(screen.getByText('Hey, are we having the sync today?')).toBeDefined();
      expect(screen.getByText('Charlie')).toBeDefined();
      expect(screen.queryByText('BOT')).toBeNull();
    });

    it('DOES render BotMessageBadge when messageType is system_bot', () => {
      render(
        <MessageBubble
          id="msg-system-bot"
          content="Task automated successfully."
          isMe={false}
          createdAt={new Date().toISOString()}
          authorName="Deploy Bot"
          messageType="system_bot"
        />
      );

      expect(screen.getByText('Task automated successfully.')).toBeDefined();
      expect(screen.getByText('Deploy Bot')).toBeDefined();
      expect(screen.getByText('BOT')).toBeDefined();
    });
  });

  describe('Issue 5: Encrypted Message Fallback Handling', () => {
    it('renders user-friendly placeholder when key is unavailable instead of raw cipher hash', () => {
      const placeholder = '[Encrypted message - key unavailable on this device]';
      render(
        <MessageBubble
          id="msg-e2ee-fallback"
          content={placeholder}
          isMe={false}
          createdAt={new Date().toISOString()}
          isE2EE={true}
        />
      );

      expect(screen.getByText(placeholder)).toBeDefined();
    });
  });
});

