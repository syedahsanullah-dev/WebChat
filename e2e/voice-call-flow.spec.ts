import { test, expect } from '@playwright/test';

test.describe('Phase 43: Playwright Dual-User WebRTC Voice Call E2E Flow', () => {
  const timestamp = Date.now();
  const userA = {
    displayName: 'Caller Alice',
    username: `alice_call_${timestamp}`.slice(0, 20),
    email: `alice_call_${timestamp}@test.local`,
    password: 'Password123!',
  };

  const userB = {
    displayName: 'Callee Bob',
    username: `bob_call_${timestamp}`.slice(0, 20),
    email: `bob_call_${timestamp}@test.local`,
    password: 'Password123!',
  };

  test('Complete 2-User WebRTC Call Lifecycle: Invite ➔ Ring ➔ Accept ➔ Mute ➔ Hangup ➔ CallLogBadge', async ({
    browser,
  }) => {
    test.setTimeout(120000);

    // 1. Create two isolated browser contexts for User A and User B with audio permissions granted
    const contextA = await browser.newContext({
      permissions: ['microphone'],
    });
    const contextB = await browser.newContext({
      permissions: ['microphone'],
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 2. Register User A in Context A
    await pageA.goto('/register');
    await pageA.fill('#displayName', userA.displayName);
    await pageA.fill('#username', userA.username);
    await pageA.fill('#email', userA.email);
    await pageA.fill('#password', userA.password);
    await expect(pageA.locator('button[type="submit"]')).toBeEnabled({ timeout: 10000 });
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL(/\/chat/, { timeout: 20000 });

    // 3. Register User B in Context B
    await pageB.goto('/register');
    await pageB.fill('#displayName', userB.displayName);
    await pageB.fill('#username', userB.username);
    await pageB.fill('#email', userB.email);
    await pageB.fill('#password', userB.password);
    await expect(pageB.locator('button[type="submit"]')).toBeEnabled({ timeout: 10000 });
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL(/\/chat/, { timeout: 20000 });

    // 4. User A finds User B via New Chat search
    const newChatButtonA = pageA.locator('button[title="New chat"]');
    await newChatButtonA.click();

    const searchInputA = pageA.locator('input[placeholder="Search by @username, name, or email..."]');
    await expect(searchInputA).toBeVisible({ timeout: 10000 });
    await searchInputA.fill(`@${userB.username}`);

    const startChatButton = pageA.locator('button[title="Start direct conversation"]').first();
    await expect(startChatButton).toBeVisible({ timeout: 15000 });
    await startChatButton.click();

    // Verify chat header with User B's name is loaded in User A's view
    await expect(pageA.locator(`h2:has-text("${userB.displayName}")`)).toBeVisible({ timeout: 10000 });

    // 5. User A initiates audio call
    const callButtonA = pageA.locator('button[title="Start voice call"]');
    await expect(callButtonA).toBeVisible({ timeout: 10000 });
    await callButtonA.click();

    // Verify User A displays OutgoingCallModal
    await expect(pageA.locator('text=Direct Encrypted Voice Call (P2P)')).toBeVisible({ timeout: 10000 });

    // 6. User B receives IncomingCallModal
    const incomingModalB = pageB.locator('text=Incoming WebChat Voice Call...');
    await expect(incomingModalB).toBeVisible({ timeout: 20000 });
    await expect(pageB.locator('text=Direct Encrypted Voice Call (P2P)')).toBeVisible();

    // User B clicks "Accept"
    const acceptButtonB = pageB.locator('button[aria-label="Accept call"]');
    await expect(acceptButtonB).toBeVisible({ timeout: 5000 });
    await acceptButtonB.click();

    // 7. Both users transition to active connected state (ActiveCallBar visible)
    const activeBarA = pageA.locator('text=VOICE CALL');
    const activeBarB = pageB.locator('text=VOICE CALL');
    await expect(activeBarA).toBeVisible({ timeout: 15000 });
    await expect(activeBarB).toBeVisible({ timeout: 15000 });

    // Verify DTLS cryptographic badge in active call bar
    await expect(pageA.locator('text=P2P Encrypted (DTLS)')).toBeVisible();
    await expect(pageB.locator('text=P2P Encrypted (DTLS)')).toBeVisible();

    // Allow call to run for 2 seconds to establish duration
    await pageA.waitForTimeout(2000);

    // 8. User A mutes their microphone
    const muteButtonA = pageA.locator('button[title="Mute microphone"]');
    await expect(muteButtonA).toBeVisible();
    await muteButtonA.click();

    // 9. User A ends the call
    const endCallButtonA = pageA.locator('button[title="End call"]');
    await expect(endCallButtonA).toBeVisible();
    await endCallButtonA.click();

    // 10. Verify ActiveCallBar is dismissed in both contexts
    await expect(activeBarA).not.toBeVisible({ timeout: 10000 });
    await expect(activeBarB).not.toBeVisible({ timeout: 10000 });

    // 11. Verify in-feed call log badge is rendered
    const callBadgeA = pageA.locator('text=/Voice call|Missed voice call|Declined voice call/');
    await expect(callBadgeA.first()).toBeVisible({ timeout: 15000 });

    // Cleanup contexts
    await contextA.close();
    await contextB.close();
  });
});
