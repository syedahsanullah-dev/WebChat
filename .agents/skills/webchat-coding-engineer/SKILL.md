---
name: webchat-coding-engineer
description: >-
  Use this skill when generating, modifying, or refactoring code for the WhatsApp Web clone.
  Enforces Next.js 15 App Router best practices, Fastify + native ws dual-server conventions,
  audio-only WebRTC calling, WhatsApp Web UI tokens, E2EE WebCrypto, and Mobile Chrome PWA install standards.
  Always honors the rule: DO NOT CODE UNTIL EXPLICITLY INSTRUCTED BY THE USER.
---

# WebChat Coding & Engineering Skill

This skill provides step-by-step implementation standards and code patterns for developing the WhatsApp Web clone across both Server #1 (Next.js) and Server #2 (Fastify + Native `ws`), including the Enterprise extensions.

## Crucial Guardrail

> [!CAUTION]
> **DO NOT CODE APPLICATION FILES UNTIL EXPLICITLY INSTRUCTED BY THE USER.**
> Only produce application code files once the user specifically gives the command to begin.

- **Zero Friction & Verification Guardrail**: Strictly **NO OTP**, **NO SMS**, **NO phone verification**, and **NO email verification codes**. Authentication and session tracking rely purely on secure HTTP-only session cookies and cryptographic session tokens.

---

## 1. Frontend & Next.js 15 Guidelines (Server #1)

- **Standalone Output Mode**: `next.config.js` must set `output: 'standalone'` so Next.js packages its own minimal `server.js` ready for Hostinger Node.js deployment.
- **Client vs Server Components**:
  - Keep pages and data-fetching server components by default.
  - Mark active chat windows, audio recorders, call modals, polls, and input fields as `'use client'`.
- **WhatsApp Web Design System (Tailwind CSS)**:
  - Dark Mode Background: `#111b21`
  - Sidebar: `#202c33`
  - Sent Message Bubble: `#005c4b`
  - Received Message Bubble: `#202c33`
  - WhatsApp Brand Green: `#00a884`
  - Double Blue Ticks: `#53bdeb`
  - Secondary Text: `#8696a0`
- **Dynamic Viewport Height for Mobile Chrome**:
  - Use `h-[100dvh]` instead of `h-screen` to prevent Android/iOS mobile browser URL bar resizing jumps.
  - Set `overscroll-behavior-y: contain` to prevent accidental swipe-down page reloads during chat scrolling.

---

## 2. Real-Time Fastify + Native `ws` Conventions (Server #2)

- **Standalone Fastify Server**: Resides in `socket-server/` with startup file `dist/index.js` (or `index.js`).
- **Memory Footprint**: Must idle around **~25–35 MB RAM**. Avoid heavy external frameworks.
- **Standard JSON Envelope Protocol (`WsEnvelope<T>`)**:
  ```typescript
  export interface WsEnvelope<T = any> {
    type: string;
    payload: T;
  }
  ```
- **In-Memory Room Manager (`roomManager.ts`)**:
  ```typescript
  roomManager.join(`chat:${chatId}`, socket);
  roomManager.broadcastToRoom(`chat:${chatId}`, { type: 'message:new', payload: message });
  roomManager.sendToUser(recipientId, { type: 'message:status', payload: statusUpdate });
  roomManager.broadcastToRoom(`chat:${chatId}`, { type: 'poll:update', payload: pollTally });
  ```
- **Heartbeat Ping-Pong**:
  - Server sends `ws.ping()` every 30 seconds.
  - If a client fails to reply with `pong` before the next interval, terminate the socket.
- **JWT Authentication Handshake**:
  - During the initial HTTP upgrade, parse `request.headers.cookie` for `auth_token`.
  - Validate JWT using `JWT_SECRET`. If invalid or expired, abort upgrade (`socket.destroy()`).

---

## 3. Web Cryptography API E2EE Conventions (SubtleCrypto)

- **ECDH Key Generation**:
  ```typescript
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false, // Private key is non-extractable
    ['deriveKey', 'deriveBits']
  );
  ```
- **AES-GCM Encryption**:
  ```typescript
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedSharedKey,
    new TextEncoder().encode(plaintext)
  );
  ```

---

## 4. WebRTC Audio-Only Implementation (No Video)

- **Media Stream Constraints**:
  ```typescript
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false, // Strict requirement: NEVER request video
  });
  ```
- **ICE Configuration**:
  ```typescript
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: process.env.NEXT_PUBLIC_TURN_URL || 'turn:relay.metered.ca:80',
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
      },
    ],
  };
  ```

---

## 5. Mobile Chrome PWA & "Install Website" Pattern

- **Web App Manifest (`public/manifest.json`)**:
  - `start_url: "/chat"`, `display: "standalone"`, `theme_color: "#111b21"`, icons: 192px, 512px, maskable 512px.
- **In-App Mobile Chrome Install Prompt**:
  - Capture `beforeinstallprompt` event on `window`.
  - Render WhatsApp-themed "Install WebChat" green banner.
  - Call `prompt()` on click and await user response.

---

## 6. Geolocation & Real-Time Mobility Pattern (Leaflet & OSM)

- **Mapping Engine**: Leaflet.js (`leaflet`) with OpenStreetMap raster tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
- **Reverse Geocoding**: Server-side proxy (`/api/location/reverse-geocode`) calling OpenStreetMap Nominatim with an in-memory LRU cache to respect OSM usage policies.
- **Battery Optimization for Live GPS**:
  - Use `navigator.geolocation.watchPosition` with `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }`.
  - Throttle updates using the Haversine formula: only transmit when the user moves `> 10 meters` or `8 seconds` have elapsed.
- **WebSocket Protocol**:
  ```typescript
  // Start live location
  roomManager.broadcastToRoom(`chat:${chatId}`, { type: 'location:live_started', payload: liveLocation });
  // Coordinate update
  roomManager.broadcastToRoom(`chat:${chatId}`, { type: 'location:live_updated', payload: { liveLocationId, lat, lng, heading } });
  // Stop live location
  roomManager.broadcastToRoom(`chat:${chatId}`, { type: 'location:live_stopped', payload: { liveLocationId } });
  ```
