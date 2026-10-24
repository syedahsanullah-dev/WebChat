# Phase 09: Group Chats & Community Administration

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Implement multi-user group conversations, a multi-step group creation workflow, native WebSocket group broadcasting using Fastify's in-memory `RoomManager`, system event announcements, and administrative governance (adding/removing participants, promoting to admin, and editing group metadata).

---

## 2. Context & Prerequisites
- **Previous Phase**: [`08_VOICE_NOTES_AND_AUDIO_MESSAGING.md`](08_VOICE_NOTES_AND_AUDIO_MESSAGING.md) (1-on-1 messaging, images, and voice notes active).
- **Environment**: Prisma ORM (`Chat`, `ChatParticipant`), Fastify + Native `ws` `RoomManager`.
- **Constraints**:
  - Broadcasts must utilize `roomManager.broadcastToRoom(`chat:${chatId}`, envelope)` to distribute messages across all connected group participants in a single operation.
  - The creator of the group is automatically assigned `role: 'admin'`.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   └── api/
│   │   │       └── groups/
│   │   │           ├── route.ts                 # POST /api/groups (create group)
│   │   │           └── [groupId]/
│   │   │               ├── route.ts             # GET /api/groups/[groupId] (info) & PATCH (update)
│   │   │               └── participants/
│   │   │                   └── route.ts         # POST /api/groups/[groupId]/participants (add/remove/role)
│   │   ├── components/
│   │   │   ├── groups/
│   │   │   │   ├── CreateGroupModal.tsx         # Multi-step group creator wizard
│   │   │   │   ├── ContactPicker.tsx            # Multi-select contact tags
│   │   │   │   ├── GroupInfoDrawer.tsx          # Right-side drawer: member list, media gallery, admin tools
│   │   │   │   └── MemberRow.tsx                # Member item with admin badge and action menu
│   │   │   └── chat/
│   │   │       ├── GroupMessageBubble.tsx       # Message bubble with sender's color & name
│   │   │       └── SystemMessageBubble.tsx      # Centered yellow/grey pill for system events
├── socket-server/
│   └── src/
│       └── handlers/
│           └── groupHandler.ts                  # group:join, group:leave, roomManager group broadcasts
└── shared/
    └── src/
        └── events.ts                            # Group event envelope interfaces
```

---

## 4. API Contracts & Data Specifications

### 1. Create Group (`POST /api/groups`)
- **Request Body**:
  ```json
  {
    "title": "Engineering Team",
    "description": "Hostinger deployment coordination",
    "avatarUrl": "/uploads/avatars/group-eng.webp",
    "participantIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"]
  }
  ```
- **Execution Flow**:
  1. Creates `Chat` record with `isGroup: true`, `groupTitle`, `groupDescription`, `groupAdminId: currentUser.id`.
  2. Inserts creator as `ChatParticipant` with `role: 'admin'`.
  3. Inserts selected users as `ChatParticipant` with `role: 'member'`.
  4. Automatically inserts initial system message: *"You created group 'Engineering Team'"*.
  5. Emits `group:created` envelope to all participant connections via `roomManager.sendToUser()`.

### 2. Group Admin Action (`POST /api/groups/[groupId]/participants`)
- **Request Body**:
  ```json
  {
    "action": "add" | "remove" | "promote" | "demote",
    "targetUserId": "user-uuid-2"
  }
  ```
- **Authorization**: Verified: only members with `role === 'admin'` can execute actions.

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Multi-Step Group Creation Wizard (`CreateGroupModal.tsx`)**:
  - Step 1 (Select Participants):
    - Searchable list of user's contacts with checkboxes.
    - Selected members displayed as removable badges/chips at the top with contact avatar and `✕` button.
    - Green forward arrow button enabled when at least 1 contact is selected.
  - Step 2 (Group Subject & Icon):
    - Circular group icon upload button.
    - Group subject input (max 100 characters) with live emoji picker and character counter.
    - Optional group description input.
    - Green checkmark button to finalize group creation.
- [ ] **2. Fastify RoomManager Group Room Operations (`groupHandler.ts`)**:
  - When any participant connects:
    - Query user's joined group IDs and call `roomManager.join(`chat:${groupId}`, socket)` for each.
  - When a message is sent to a group:
    - Save message to MySQL.
    - Call `roomManager.broadcastToRoom(`chat:${chatId}`, { type: 'message:new', payload: message })`.
  - When a participant is added or removed:
    - Broadcast `group:member_update` envelope so clients update member counts live.
- [ ] **3. Group Chat Message Presentation**:
  - `GroupMessageBubble.tsx`:
    - Shows sender's `displayName` above the message text.
    - Assigns a consistent deterministic color to each participant based on their `userId`.
  - `SystemMessageBubble.tsx`:
    - Centered pill with small font and rounded corners:
      - *"Alex created group 'Engineering Team'"*
      - *"You were added"*
      - *"Sarah was removed"*
- [ ] **4. Group Info & Management Drawer (`GroupInfoDrawer.tsx`)**:
  - Pinned right-side drawer displaying:
    - Large group avatar, title, and member count (*"5 participants"*).
    - Group description with edit pencil (for admins).
    - Media, Links, and Docs preview strip.
    - Participant list:
      - Shows avatar, name, `@username`, and green *"Group Admin"* tag for admins.
      - Clicking a member reveals admin menu: *"Make group admin"*, *"Remove from group"*, or *"Message @..."*.
    - Red *"Exit Group"* button at the bottom.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 09 complete, verify:
1. Creating a group with 3 members succeeds and opens the new group chat.
2. Sending a message in the group appears instantly on all 3 participants' screens with the sender's color-coded name.
3. System events appear as centered badges when members are added or leave.
4. An admin can successfully remove a participant or promote another member to admin.
5. Non-admin users cannot see admin management buttons.

---

## 7. Handoff to Phase 10
Phase 10 will implement Advanced Messaging Features (quoted message replies, hover emoji reaction pill, in-chat text search, and message deletion).
