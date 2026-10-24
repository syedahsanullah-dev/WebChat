import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Avatar, { getInitials } from '@/components/ui/Avatar';
import SearchInput from '@/components/ui/SearchInput';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import Modal from '@/components/ui/Modal';
import ChatLayout from '@/app/chat/layout';
import { ThemeProvider } from '@/context/ThemeContext';

describe('Adversarial & Stress Tests: UI Primitives & Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.HTMLElement.prototype.scrollIntoView = vi.fn();
    }
  });

  describe('SearchInput Keyboard Shortcut & Edge Cases', () => {
    it('focuses and selects input on Cmd + / (Mac metaKey)', () => {
      const handleChange = vi.fn();
      render(<SearchInput value="test query" onChange={handleChange} placeholder="Search" />);
      const input = screen.getByPlaceholderText('Search') as HTMLInputElement;

      input.blur();
      expect(document.activeElement).not.toBe(input);

      // Dispatch Cmd + / (metaKey)
      const event = new KeyboardEvent('keydown', {
        key: '/',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);

      expect(document.activeElement).toBe(input);
      expect(event.defaultPrevented).toBe(true);
    });

    it('does NOT trigger shortcut on Ctrl + other keys or key without modifier', () => {
      render(<SearchInput value="" onChange={() => {}} placeholder="Search" />);
      const input = screen.getByPlaceholderText('Search');
      input.blur();

      // Regular '/' without Ctrl or Cmd
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
      expect(document.activeElement).not.toBe(input);

      // Ctrl + 'k'
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
      expect(document.activeElement).not.toBe(input);
    });

    it('clicking clear button resets value, calls onClear, and maintains focus on input', () => {
      const handleChange = vi.fn();
      const handleClear = vi.fn();
      render(<SearchInput value="search text" onChange={handleChange} onClear={handleClear} placeholder="Search" />);

      const input = screen.getByPlaceholderText('Search');
      const clearBtn = screen.getByLabelText('Clear search');

      fireEvent.click(clearBtn);

      expect(handleChange).toHaveBeenCalledWith('');
      expect(handleClear).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Modal Dismissal & Body Scroll Lock Stress Tests', () => {
    it('restores body overflow style when modal is unmounted or closed', () => {
      document.body.style.overflow = 'visible';

      const { unmount, rerender } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Dialog Content</p>
        </Modal>
      );

      // While open, body overflow is locked to hidden
      expect(document.body.style.overflow).toBe('hidden');

      // When closed via isOpen=false
      rerender(
        <Modal isOpen={false} onClose={() => {}}>
          <p>Dialog Content</p>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('visible');

      // Reopen and then unmount component
      rerender(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Dialog Content</p>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');
      unmount();
      expect(document.body.style.overflow).toBe('visible');
    });

    it('does NOT dismiss modal on non-Escape key events', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Escape Test">
          <p>Content</p>
        </Modal>
      );

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Tab' });
      fireEvent.keyDown(window, { key: ' ' });

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('does NOT dismiss modal when clicking inside dialog body', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Inside Click Test">
          <button data-testid="inner-button">Inner Button</button>
        </Modal>
      );

      fireEvent.click(screen.getByTestId('inner-button'));
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('dismisses modal when clicking backdrop overlay', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <Modal isOpen={true} onClose={handleClose} title="Backdrop Test">
          <p>Body</p>
        </Modal>
      );

      const backdrop = container.querySelector('[role="presentation"]');
      expect(backdrop).not.toBeNull();
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(handleClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Avatar Robustness & Initials Generator', () => {
    it('handles various name formats and edge cases', () => {
      expect(getInitials('Single')).toBe('SI');
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('A B C D')).toBe('AB');
      expect(getInitials('   Trimmed Name   ')).toBe('TN');
      expect(getInitials('@username')).toBe('US');
      expect(getInitials('12345')).toBe('12');
      expect(getInitials('')).toBe('?');
      expect(getInitials('   ')).toBe('?');
    });

    it('falls back to initials when avatar image fails to load (onError)', () => {
      render(<Avatar name="Broken Image" src="https://example.com/invalid.jpg" />);
      const img = screen.getByRole('img');
      expect(img).toBeDefined();

      // Trigger image error
      fireEvent.error(img);

      // Now fallback initials 'BI' should be visible
      expect(screen.getByText('BI')).toBeDefined();
    });
  });

  describe('DropdownMenu Light Dismiss & Items', () => {
    it('closes dropdown when pointerdown event occurs outside', () => {
      const items: DropdownMenuItem[] = [{ id: '1', label: 'Item 1', onClick: vi.fn() }];
      render(
        <div>
          <span data-testid="outside">Outside Element</span>
          <DropdownMenu items={items} />
        </div>
      );

      // Open menu
      fireEvent.click(screen.getByLabelText('Menu'));
      expect(screen.queryByText('Item 1')).not.toBeNull();

      // Click outside
      fireEvent.pointerDown(screen.getByTestId('outside'));
      expect(screen.queryByText('Item 1')).toBeNull();
    });

    it('disabled item does not trigger onClick and closes nothing', () => {
      const handleClick = vi.fn();
      const items: DropdownMenuItem[] = [
        { id: '1', label: 'Disabled Item', onClick: handleClick, disabled: true },
      ];
      render(<DropdownMenu items={items} />);

      fireEvent.click(screen.getByLabelText('Menu'));
      const item = screen.getByText('Disabled Item');
      fireEvent.click(item);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Mobile Sliding Behavior & Layout Geometry', () => {
    it('verifies layout container has dynamic viewport and overscroll containment classes', () => {
      const { container } = render(
        <ThemeProvider>
          <ChatLayout>
            <div>Chat Children Content</div>
          </ChatLayout>
        </ThemeProvider>
      );

      const rootDiv = container.querySelector('.h-\\[100dvh\\]') as HTMLElement;
      expect(rootDiv).not.toBeNull();
      expect(rootDiv.classList.contains('h-[100dvh]')).toBe(true);
      expect(rootDiv.classList.contains('overscroll-y-contain')).toBe(true);
    });

    it('toggles mobile sliding classes when conversation is opened and closed via back button', () => {
      const { container } = render(
        <ThemeProvider>
          <ChatLayout>
            <div>Chat Body</div>
          </ChatLayout>
        </ThemeProvider>
      );

      const rootDiv = container.querySelector('.h-\\[100dvh\\]') as HTMLElement;
      expect(rootDiv).not.toBeNull();

      // Children 0 is sidebar panel, Children 1 is chat area panel
      const sidebarContainer = rootDiv.children[0] as HTMLElement;
      const chatAreaContainer = rootDiv.children[1] as HTMLElement;

      // In idle state:
      // Sidebar should have translate-x-0 relative
      expect(sidebarContainer.classList.contains('translate-x-0')).toBe(true);
      expect(sidebarContainer.classList.contains('relative')).toBe(true);

      // ChatArea should have translate-x-full absolute md:relative
      expect(chatAreaContainer.classList.contains('translate-x-full')).toBe(true);
      expect(chatAreaContainer.classList.contains('absolute')).toBe(true);

      // Click on a conversation in the sidebar (e.g., 'Sarah Connor')
      const convButton = screen.getByText('Sarah Connor');
      fireEvent.click(convButton);

      // In active state:
      // Sidebar should now have -translate-x-full absolute
      expect(sidebarContainer.classList.contains('-translate-x-full')).toBe(true);
      expect(sidebarContainer.classList.contains('absolute')).toBe(true);

      // ChatArea should now have translate-x-0 relative
      expect(chatAreaContainer.classList.contains('translate-x-0')).toBe(true);
      expect(chatAreaContainer.classList.contains('relative')).toBe(true);

      // Click the mobile back button (ArrowLeft icon / Back button)
      const backBtn = screen.getByLabelText('Back to conversations list');
      expect(backBtn).toBeDefined();
      fireEvent.click(backBtn);

      // After clicking back button:
      // Sidebar should slide back to translate-x-0 relative
      expect(sidebarContainer.classList.contains('translate-x-0')).toBe(true);
      expect(sidebarContainer.classList.contains('relative')).toBe(true);

      // ChatArea should slide away to translate-x-full absolute
      expect(chatAreaContainer.classList.contains('translate-x-full')).toBe(true);
      expect(chatAreaContainer.classList.contains('absolute')).toBe(true);
    });
  });
});
