# Phase 04: Contact Discovery & Address Book

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1)  
**Primary Goal**: Implement real-time contact discovery and address book management. Enable users to search the platform by `@username` prefix or exact `email`, add users to their personal contact list with custom nicknames, and initiate direct conversations without phone numbers.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`03_AUTHENTICATION_AND_PROFILE.md`](03_AUTHENTICATION_AND_PROFILE.md) (User authentication, profile management, and sessions active).
- **Environment**: Next.js 15 App Router, Prisma ORM (`User` and `Contact` models).
- **Design Rule**:
  - The discovery process uses `@username` and `email` exclusively.
  - The interface must mirror WhatsApp Web's "New Chat" green floating action button and contact picker drawer.

---

## 3. Architectural Structure & Target Files

```text
web/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── users/
│   │       │   └── search/
│   │       │       └── route.ts     # GET /api/users/search?q=query (prefix match)
│   │       └── contacts/
│   │           ├── route.ts         # GET /api/contacts (list) & POST /api/contacts (add)
│   │           └── [contactId]/
│   │               └── route.ts     # DELETE /api/contacts/[contactId] (remove/block)
│   ├── components/
│   │   ├── contacts/
│   │   │   ├── NewChatModal.tsx     # Popup search modal with instant results
│   │   │   ├── ContactDrawer.tsx    # Slide-over alphabetical contact list
│   │   │   ├── ContactCard.tsx      # Individual contact item with action buttons
│   │   │   └── AddContactDialog.tsx # Modal to assign optional custom nickname
│   │   └── sidebar/
│   │       └── SidebarHeader.tsx    # New Chat (+) icon triggering NewChatModal
│   └── hooks/
│       └── useDebounce.ts           # Debounce utility hook for search input (300ms)
```

---

## 4. API Contracts & Data Specifications

### 1. User Search (`GET /api/users/search?q=alex`)
- **Query Params**: `q` (search string)
- **Logic**:
  - If `q` starts with `@`, strip `@` and perform `startsWith` match on `User.username`.
  - Also search `User.email` (exact match) and `User.displayName` (contains).
  - Exclude authenticated user (`id !== currentUser.id`).
  - Limit results to 15 records for speed.
- **Response (`200 OK`)**:
  ```json
  [
    {
      "id": "uuid-123",
      "username": "alexander",
      "displayName": "Alex Turner",
      "avatarUrl": "/uploads/avatars/alex.webp",
      "about": "Available",
      "isContact": false,
      "existingChatId": null
    }
  ]
  ```

### 2. Add Contact (`POST /api/contacts`)
- **Request Body**:
  ```json
  {
    "contactUserId": "uuid-123",
    "aliasName": "Alex (Band Leader)" // Optional nickname
  }
  ```
- **Validation**:
  - `contactUserId` must exist and cannot be the current user.
  - Upsert or create entry in `contacts` table with unique constraint `[userId, contactUserId]`.
- **Response (`201 Created`)**:
  ```json
  {
    "id": "contact-uuid",
    "userId": "current-user-uuid",
    "contactUserId": "uuid-123",
    "aliasName": "Alex (Band Leader)",
    "contactUser": { "username": "alexander", "displayName": "Alex Turner", "avatarUrl": "..." }
  }
  ```

### 3. Fetch Contacts (`GET /api/contacts`)
- **Response (`200 OK`)**:
  - Array of contacts sorted alphabetically by `aliasName` or `displayName`.

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Debounce Hook & Search API**:
  - Create `web/src/hooks/useDebounce.ts` (delays execution by 300ms).
  - Implement `GET /api/users/search/route.ts`:
    - Fast indexed Prisma query querying `username` with `startsWith`.
    - Join `Contact` table to flag whether each result is already an added contact.
- [ ] **2. "New Chat" Search Modal**:
  - Build `web/src/components/contacts/NewChatModal.tsx`:
    - Triggered by clicking the green pencil/chat icon in the sidebar header.
    - Full-screen or centered modal with autofocus search input.
    - Displays loading spinner while debounced query runs.
    - Empty state: *"No users found matching '@...'"*.
    - Result list with avatar, display name, `@username`, and bio snippet.
- [ ] **3. Quick Actions on Search Results**:
  - On each search result card:
    - **"Start Chat" Button**: Immediately calls `POST /api/chats/direct` (from Phase 06) or opens the chat route `/chat/[chatId]`.
    - **"Add Contact" Button**: Opens `AddContactDialog.tsx` to set an optional nickname, then saves to `contacts`.
- [ ] **4. Alphabetical Contact Drawer**:
  - Build `web/src/components/contacts/ContactDrawer.tsx`:
    - Slide-over panel listing all added contacts.
    - Alphabetical section headers (A, B, C...).
    - Quick filter search bar to filter the local contact list.
    - Option to remove or block contact.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 04 complete, verify:
1. Clicking the "New Chat" icon opens the contact search modal with autofocus.
2. Typing `@` followed by a known username (e.g., `@developer`) shows the matching user card within 300ms.
3. Searching for your own username yields zero results (self-exclusion).
4. Clicking "Add Contact" successfully stores the record in the `contacts` table and changes the button to "Added".
5. Opening the Contact Drawer displays the newly added contact under the correct alphabetical header.

---

## 7. Handoff to Phase 05
Phase 05 will activate the real-time presence engine on Server #2 (`socket-server/`), tracking live online/offline states, last seen timestamps, and throttled typing indicators.
