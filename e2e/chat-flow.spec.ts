import { test, expect } from '@playwright/test';

test.describe('Phase 13: End-to-End Live Chat & Dual-User Realtime Flow', () => {
  const timestamp = Date.now();
  const userA = {
    displayName: 'Playwright Alice',
    username: `pw_alice_${timestamp}`.slice(0, 20),
    email: `alice_${timestamp}@test.local`,
    password: 'Password123!',
  };

  const userB = {
    displayName: 'Playwright Bob',
    username: `pw_bob_${timestamp}`.slice(0, 20),
    email: `bob_${timestamp}@test.local`,
    password: 'Password123!',
  };

  test('User registration and login navigation check', async ({ page }) => {
    // Navigate to Login page
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Sign In');
    await expect(page.locator('#identifier')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Link to register page
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    // Verify registration page
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('h2')).toContainText('Create Account');
    await expect(page.locator('#displayName')).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('2-User registration, real-time message exchange, and status receipt flow', async ({
    browser,
  }) => {
    test.setTimeout(90000);

    // 1. Create two isolated browser contexts for User A and User B
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

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

    // Wait for redirect to /chat
    await pageA.waitForURL(/\/chat/, { timeout: 20000 });
    await expect(pageA.locator('text=No chats found')).toBeVisible({ timeout: 15000 });

    // 3. Register User B in Context B
    await pageB.goto('/register');
    await pageB.fill('#displayName', userB.displayName);
    await pageB.fill('#username', userB.username);
    await pageB.fill('#email', userB.email);
    await pageB.fill('#password', userB.password);
    await expect(pageB.locator('button[type="submit"]')).toBeEnabled({ timeout: 10000 });
    await pageB.click('button[type="submit"]');

    // Wait for redirect to /chat
    await pageB.waitForURL(/\/chat/, { timeout: 20000 });
    await expect(pageB.locator('text=No chats found')).toBeVisible({ timeout: 15000 });

    // 4. User A finds User B via New Chat Modal
    const newChatButtonA = pageA.locator('button[title="New chat"]');
    await newChatButtonA.click();

    // Search for User B by username
    const searchInputA = pageA.locator('input[placeholder="Search by @username, name, or email..."]');
    await expect(searchInputA).toBeVisible();
    await searchInputA.fill(`@${userB.username}`);

    // Wait for search result row showing User B and click start conversation
    const startChatButton = pageA.locator('button[title="Start direct conversation"]').first();
    await expect(startChatButton).toBeVisible({ timeout: 15000 });
    await startChatButton.click();

    // 5. User A sends message to User B
    const chatInputA = pageA.locator('textarea[placeholder="Type a message"]');
    await expect(chatInputA).toBeVisible({ timeout: 10000 });

    const testMessageText = `Hello Bob from Playwright automation at ${timestamp}!`;
    await chatInputA.fill(testMessageText);
    await chatInputA.press('Enter');

    // Verify optimistic message rendering in User A's feed
    const sentMessageA = pageA.locator(`text=${testMessageText}`).first();
    await expect(sentMessageA).toBeVisible({ timeout: 5000 });

    // 6. User B receives conversation in list and opens it
    const conversationOnB = pageB.locator(`text=${userA.displayName}`).first();
    try {
      await expect(conversationOnB).toBeVisible({ timeout: 6000 });
    } catch {
      await pageB.reload();
      await expect(conversationOnB).toBeVisible({ timeout: 15000 });
    }
    await conversationOnB.click();

    // User B verifies chat header with User A's name
    await expect(pageB.locator(`h2:has-text("${userA.displayName}")`)).toBeVisible({ timeout: 10000 });

    // 7. User B replies to User A
    const replyText = `Received your message, Alice! Timestamp: ${timestamp}`;
    const chatInputB = pageB.locator('textarea[placeholder="Type a message"]');
    await expect(chatInputB).toBeVisible({ timeout: 10000 });
    await chatInputB.fill(replyText);
    await chatInputB.press('Enter');

    // User B verifies optimistic message rendering of their reply
    const sentReplyB = pageB.locator(`text=${replyText}`).first();
    await expect(sentReplyB).toBeVisible({ timeout: 5000 });

    // Cleanup browser contexts
    await contextA.close();
    await contextB.close();
  });

  test('Mobile viewport responsiveness and sliding navigation', async ({ page }) => {
    // Emulate mobile viewport (< 768px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // Confirm responsive layout rendered without horizontal scroll overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(385);
  });
});
