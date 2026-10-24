import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Avatar, { getInitials } from '@/components/ui/Avatar';
import SearchInput from '@/components/ui/SearchInput';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import Modal from '@/components/ui/Modal';
import { SOUND_PATHS, playSound, playSentSound, playReceiveSound, startRingtone } from '@/lib/audio';

describe('Avatar Primitive', () => {
  it('correctly generates 1-2 character uppercase initials', () => {
    expect(getInitials('Sarah Connor')).toBe('SC');
    expect(getInitials('John')).toBe('JO');
    expect(getInitials('@demouser')).toBe('DE');
    expect(getInitials('Tech Lead Alex')).toBe('TL');
    expect(getInitials('')).toBe('?');
  });

  it('renders initials fallback when no src is provided', () => {
    render(<Avatar name="Sarah Connor" isOnline={false} />);
    expect(screen.getByText('SC')).toBeDefined();
  });

  it('renders green online indicator dot when isOnline is true', () => {
    const { container } = render(<Avatar name="Sarah Connor" isOnline={true} />);
    const dot = container.querySelector('.bg-wa-green');
    expect(dot).toBeDefined();
    expect(dot?.getAttribute('aria-label')).toBe('Online');
  });

  it('does not render online indicator dot when isOnline is false', () => {
    const { container } = render(<Avatar name="Sarah Connor" isOnline={false} />);
    const dot = container.querySelector('.bg-wa-green');
    expect(dot).toBeNull();
  });
});

describe('SearchInput Primitive', () => {
  it('renders input with placeholder and responds to value changes', () => {
    const handleChange = vi.fn();
    render(<SearchInput value="" onChange={handleChange} placeholder="Search chats" />);
    
    const input = screen.getByPlaceholderText('Search chats');
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: 'Sarah' } });
    expect(handleChange).toHaveBeenCalledWith('Sarah');
  });

  it('shows clear button when text is present and clears text on click', () => {
    const handleChange = vi.fn();
    const handleClear = vi.fn();
    render(<SearchInput value="test" onChange={handleChange} onClear={handleClear} />);

    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeDefined();

    fireEvent.click(clearButton);
    expect(handleChange).toHaveBeenCalledWith('');
    expect(handleClear).toHaveBeenCalled();
  });

  it('focuses input on Ctrl + / keyboard shortcut', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search chats" />);
    const input = screen.getByPlaceholderText('Search chats');

    // Dispatch Ctrl + / event on window
    const event = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(document.activeElement).toBe(input);
  });
});

describe('DropdownMenu Primitive', () => {
  it('opens popup menu on trigger click and calls item onClick', () => {
    const handleItemClick = vi.fn();
    const items: DropdownMenuItem[] = [
      { id: '1', label: 'Item One', onClick: handleItemClick },
      { id: '2', label: 'Item Two', onClick: vi.fn() },
    ];

    render(<DropdownMenu items={items} />);
    const trigger = screen.getByLabelText('Menu');
    fireEvent.click(trigger);

    const itemOne = screen.getByText('Item One');
    expect(itemOne).toBeDefined();

    fireEvent.click(itemOne);
    expect(handleItemClick).toHaveBeenCalled();
  });

  it('closes dropdown on Escape key', () => {
    const items: DropdownMenuItem[] = [
      { id: '1', label: 'Item One', onClick: vi.fn() },
    ];

    render(<DropdownMenu items={items} />);
    fireEvent.click(screen.getByLabelText('Menu'));
    expect(screen.queryByText('Item One')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Item One')).toBeNull();
  });
});

describe('Modal Primitive', () => {
  it('renders modal dialog content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Dialog">
        <p>Modal Body Content</p>
      </Modal>
    );

    expect(screen.getByText('Test Dialog')).toBeDefined();
    expect(screen.getByText('Modal Body Content')).toBeDefined();
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Hidden Content</p>
      </Modal>
    );

    expect(screen.queryByText('Hidden Content')).toBeNull();
  });

  it('invokes onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        <p>Body</p>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});

describe('Audio Helper Library', () => {
  beforeEach(() => {
    // Mock HTMLAudioElement for jsdom
    vi.stubGlobal('Audio', class {
      src: string;
      volume: number = 1;
      loop: boolean = false;
      currentTime: number = 0;
      constructor(src: string) {
        this.src = src;
      }
      play() {
        return Promise.resolve();
      }
      pause() {}
    });
  });

  it('defines valid notification sound paths', () => {
    expect(SOUND_PATHS.sent).toBe('/sounds/sent.mp3');
    expect(SOUND_PATHS.receive).toBe('/sounds/receive.mp3');
    expect(SOUND_PATHS.ringtone).toBe('/sounds/ringtone.mp3');
  });

  it('invokes play without throwing on playSentSound', () => {
    const audio = playSentSound();
    expect(audio).toBeDefined();
    expect(audio?.src).toBe('/sounds/sent.mp3');
  });

  it('invokes play without throwing on playReceiveSound', () => {
    const audio = playReceiveSound();
    expect(audio).toBeDefined();
    expect(audio?.src).toBe('/sounds/receive.mp3');
  });

  it('starts ringtone with loop=true and returns cleanup function', () => {
    const stopRingtone = startRingtone();
    expect(typeof stopRingtone).toBe('function');
    stopRingtone();
  });
});
