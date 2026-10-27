# Phase 11: Real-Time Audio Calling (WebRTC Voice via Server #2)

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1) & `socket-server/` (Server #2)  
**Primary Goal**: Build peer-to-peer real-time 1-on-1 encrypted audio calling directly in the browser. WebRTC call signaling is handled through Server #2 (**Fastify + Native `ws`**), NAT traversal is managed via free Google STUN and free Metered.ca TURN, audio quality is optimized using the Opus codec with echo cancellation, and all call outcomes are recorded in the `call_logs` table.

> [!IMPORTANT]
> **VIDEO STREAMING IS STRICTLY DISABLED**:
> `getUserMedia` must specify `video: false` under all circumstances. Voice calling uses only ~32 kbps of bandwidth, enabling over 2,500 hours of relayed voice calling per month at $0 extra cost.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md`](10_ADVANCED_MESSAGING_REPLIES_REACTIONS_SEARCH.md) (All text and media interactions operational).
- **Environment**: WebRTC API (`RTCPeerConnection`), Web Audio API, Google STUN, Metered.ca TURN relay.
- **Prisma Schema**: `CallLog` model created in Phase 02.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   └── call/
│   │   │       ├── OutgoingCallModal.tsx    # Outgoing ringing overlay with pulsating avatar
│   │   │       ├── IncomingCallModal.tsx    # Incoming popup with ringtone, accept & decline
│   │   │       ├── ActiveCallBar.tsx        # Top floating bar: timer, mute mic, audio device, end
│   │   │       └── CallLogBadge.tsx         # In-chat badge: "Voice call - 4m 12s" or "Missed call"
│   │   └── hooks/
│   │       ├── useWebRTC.ts                 # RTCPeerConnection lifecycle, ICE candidates, audio stream
│   │       └── useCallSignaling.ts          # Native ws signaling events & call state machine
├── socket-server/
│   └── src/
│       └── handlers/
│           └── callSignalingHandler.ts      # ws envelope handler for audio-call signaling
└── shared/
    └── src/
        └── events.ts                        # WebRTC call signaling payload types
```

---

## 4. WebRTC Call Signaling Flow & Contracts

```mermaid
sequenceDiagram
    participant Caller as Caller Browser (User A)
    participant WS as Server #2: Fastify + ws
    participant Receiver as Receiver Browser (User B)

    Caller->>Caller: getUserMedia({ audio: true, video: false })
    Caller->>WS: send { type: "audio-call:invite", payload: { recipientId, chatId, offerSdp } }
    WS->>Receiver: send { type: "audio-call:incoming", payload: { callerId, callerName, chatId, offerSdp } }
    Receiver->>Receiver: Plays ringtone.mp3 & displays IncomingCallModal
    Receiver->>Receiver: User clicks "Accept" -> getUserMedia({ audio: true, video: false })
    Receiver->>WS: send { type: "audio-call:accept", payload: { callerId, answerSdp } }
    WS->>Caller: send { type: "audio-call:accepted", payload: { answerSdp } }
    Caller<->Receiver: Exchange ICE Candidates via Server #2 ws envelopes
    Caller<==>Receiver: Direct Encrypted P2P Opus Audio Stream (STUN/TURN)
    Note over Caller,Receiver: Both browsers hear real-time audio
    Caller->>WS: send { type: "audio-call:end", payload: { chatId, duration } }
    WS->>Receiver: send { type: "audio-call:ended" }
    WS->>WS: Writes CallLog record to MySQL
```

### Call State Machine (`web/src/hooks/useCallSignaling.ts`)
```typescript
export type CallState = 
  | 'idle'
  | 'outgoing_calling'
  | 'outgoing_ringing'
  | 'incoming_ringing'
  | 'connecting'
  | 'connected'
  | 'ended';
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. WebRTC ICE Configuration & Hook (`useWebRTC.ts`)**:
  - Configure `iceServers`:
    ```typescript
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: process.env.NEXT_PUBLIC_TURN_URL || 'turn:relay.metered.ca:80',
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
      },
    ];
    ```
  - Acquire audio stream strictly without video:
    ```typescript
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false, // MANDATORY: Never request video
    });
    ```
  - Attach audio stream to remote `<audio autoPlay />` element.
- [ ] **2. Server #2 Native `ws` Signaling Handler (`callSignalingHandler.ts`)**:
  - `audio-call:invite`: Forward SDP Offer to recipient via `roomManager.sendToUser()`. If recipient is busy, send `audio-call:busy` back to caller.
  - `audio-call:ring`: Forward ringing state to caller.
  - `audio-call:accept`: Forward SDP Answer to caller.
  - `audio-call:reject`: Forward rejection notice to caller; persist `"rejected"` in `call_logs`.
  - `audio-call:ice-candidate`: Relay ICE candidate between peers.
  - `audio-call:end`: Notify peer, persist call duration and status in `call_logs`, and insert call log badge in conversation.
- [ ] **3. Outgoing Call Screen (`OutgoingCallModal.tsx`)**:
  - Initiated by clicking phone icon in chat header.
  - Displays full-screen or modal overlay with recipient's avatar pulsing with green concentric rings.
  - Displays status text: *"Calling..."* ➔ *"Ringing..."*.
  - Red circular "End Call" button.
- [ ] **4. Incoming Call Modal (`IncomingCallModal.tsx`)**:
  - Pops up over any screen when `audio-call:incoming` envelope arrives.
  - Loops WhatsApp audio ringtone (`/sounds/ringtone.mp3`).
  - Displays caller's name, `@username`, and avatar.
  - Green circular "Accept" button and red circular "Decline" button.
- [ ] **5. Active Call Control Bar (`ActiveCallBar.tsx`)**:
  - Docked at the top of the chat window during an ongoing call:
    - Call timer counting duration (`01:42`).
    - Recipient name and avatar with live audio activity indicator.
    - Mute Microphone toggle button (mutes local audio track).
    - Audio Device selector (switches between headphones/speaker).
    - Red End Call button.
- [ ] **6. In-Chat Call Summary Badges (`CallLogBadge.tsx`)**:
  - After call ends, insert system bubble into chat history:
    - Completed call: *"📞 Voice call - 4m 12s"*
    - Missed call: *"📞 Missed voice call"* in red text.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 11 complete, verify:
1. Clicking the phone icon in the chat header sends `audio-call:invite` and opens the outgoing calling modal.
2. The recipient immediately hears `ringtone.mp3` and sees the incoming call popup.
3. Clicking "Accept" connects the call:
   - Speaking into User A's mic produces clear audio output on User B's speakers/headphones.
   - Video is completely absent (no camera light or permissions requested).
4. Clicking "Mute" disables the microphone track and shows a mute icon to the peer.
5. Ending the call inserts a call summary badge into the chat history and records a row in the `call_logs` table.

---

## 7. Handoff to Phase 12
Phase 12 will implement the Progressive Web App (PWA) & Mobile Chrome Install Experience (`manifest.json`, service worker, and the custom "Install WebChat" mobile prompt).
