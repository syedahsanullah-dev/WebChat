# Phase 41: WebRTC Network Resilience, TLS TURN Traversal & ICE Connection Recovery

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1), `socket-server/` (Server #2), and configuration files  
**Primary Goal**: Safeguard WebRTC audio calls against strict corporate firewalls, mobile Wi-Fi/LTE network handovers, and Metered.ca free-tier quota exhaustion at **$0.00 additional monthly cost**. This phase configures **TLS TURN over TCP port 443** (`turns:relay.metered.ca:443?transport=tcp`) to tunnel encrypted voice streams through firewalls that block standard UDP ports. It introduces an automated **ICE restart protocol** (`pc.restartIce()`) and a `'reconnecting'` UI state to seamlessly preserve active calls when a user moves between Wi-Fi and mobile data. Additionally, it implements client-side **TURN relay bandwidth telemetry** to track usage against Metered.ca's 50 GB/month limit, and hardens Fastify WebSocket ping-pong timers against Hostinger reverse proxy timeouts.

> [!IMPORTANT]
> **Zero Added Cost & Bandwidth Guardrail**:
> Strictly utilize Metered.ca's free tier (50 GB/mo) and free public STUN servers (Google + Cloudflare). Direct P2P connections via STUN must always take precedence over relayed TURN candidates to minimize bandwidth consumption. Strictly **NO paid telephony or cloud media gateways**.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`40_MOBILE_PWA_VOICE_WAKELOCK_AND_BACKGROUND_ALERTS.md`](40_MOBILE_PWA_VOICE_WAKELOCK_AND_BACKGROUND_ALERTS.md) (Mobile PWA ergonomics & background push operational).
- **Core Calling Reference**: [`11_AUDIO_CALLING_WEBRTC_VOICE.md`](11_AUDIO_CALLING_WEBRTC_VOICE.md).
- **Environment**: Next.js 15, WebRTC API (`RTCPeerConnection`), Google STUN, Metered.ca TURN, Fastify 4+ daemon.

---

## 3. Architectural Structure & Target Files

```text
WebChat/
├── .env.example                             # Updated with NEXT_PUBLIC_TURN_TLS_URL
├── TECH_STACK_AND_ENV_CONFIG.md             # Updated ICE server documentation
├── web/
│   └── src/
│       ├── components/
│       │   └── call/
│       │       └── ActiveCallBar.tsx        # Reconnecting badge & network quality visual indicator
│       ├── hooks/
│       │   ├── useWebRTC.ts                 # TLS TURN config, ICE candidate priority, restartIce()
│       │   └── useCallSignaling.ts          # 'reconnecting' state machine with 10s grace window
│       └── lib/
│           └── turnQuotaEstimator.ts        # Client-side relayed byte tracker (WebRTC stats API)
└── socket-server/
    └── src/
        └── index.ts                         # 25-second adaptive keep-alive ping for Hostinger proxy
```

---

## 4. Network Handover & ICE Restart Sequence

```mermaid
sequenceDiagram
    autonumber
    participant ClientA as Alice (Moving from Wi-Fi to LTE)
    participant WS as Server #2: Fastify + ws
    participant ClientB as Bob (Stable Connection)

    Note over ClientA,ClientB: Active Call (Direct P2P via STUN)
    ClientA->>ClientA: Wi-Fi drops; cellular LTE connects
    ClientA->>ClientA: pc.iceConnectionState -> 'disconnected'
    ClientA->>ClientA: setCallState('reconnecting')
    Note over ClientA: ActiveCallBar displays yellow "Reconnecting..." badge

    ClientA->>ClientA: pc.restartIce()
    ClientA->>WS: audio-call:ice-restart { callId, offerSdp }
    WS->>ClientB: audio-call:ice-restart { callId, offerSdp }
    ClientB->>WS: audio-call:ice-restart-answer { callId, answerSdp }
    WS->>ClientA: audio-call:ice-restart-answer { callId, answerSdp }

    ClientA<->ClientB: Exchange new ICE candidates (STUN / TLS TURN port 443)
    ClientA->>ClientA: pc.iceConnectionState -> 'connected'
    ClientA->>ClientA: setCallState('connected')
    Note over ClientA,ClientB: Audio Restored Without Dropping Call!
```

---

## 5. Detailed Step-by-Step Implementation Tasks

### 5.1 Redundant ICE & TLS TURN Configuration (`useWebRTC.ts` & `.env.example`)
- [ ] In `web/src/hooks/useWebRTC.ts`:
  - Enhance `DEFAULT_ICE_SERVERS` with multi-region Google STUN and Cloudflare STUN:
    ```typescript
    const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ];
    ```
  - In `getIceServers()`:
    - Support both standard TURN and secure TLS TURN (`turns:` over port 443) using TCP transport:
      ```typescript
      const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || 'turn:relay.metered.ca:80';
      const turnTlsUrl = process.env.NEXT_PUBLIC_TURN_TLS_URL || 'turns:relay.metered.ca:443?transport=tcp';
      const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
      const turnPassword = process.env.NEXT_PUBLIC_TURN_PASSWORD;

      if (turnUsername && turnPassword) {
        servers.push(
          { urls: turnUrl, username: turnUsername, credential: turnPassword },
          { urls: turnTlsUrl, username: turnUsername, credential: turnPassword }
        );
      }
      ```
- [ ] Update `web/.env.example` and `TECH_STACK_AND_ENV_CONFIG.md` to document `NEXT_PUBLIC_TURN_TLS_URL`.

### 5.2 Automated ICE Restart & Reconnecting State (`useWebRTC.ts` & `useCallSignaling.ts`)
- [ ] In `web/src/hooks/useCallSignaling.ts`:
  - Extend `CallState` enum:
    ```typescript
    export type CallState =
      | 'idle'
      | 'outgoing_calling'
      | 'outgoing_ringing'
      | 'incoming_ringing'
      | 'connecting'
      | 'connected'
      | 'reconnecting'
      | 'ended';
    ```
  - In `webRTC.onConnectionStateChange`:
    - When `state === 'disconnected'`:
      - Set `callState` to `'reconnecting'`.
      - Start a 10-second grace timer. If state does not transition back to `'connected'` within 10 seconds, invoke `handleEndCall('connection_lost')`.
    - When `state === 'connected'`:
      - Cancel grace timer; set `callState` to `'connected'`.
- [ ] In `web/src/hooks/useWebRTC.ts`:
  - Export `restartIce(): Promise<RTCSessionDescriptionInit>`:
    ```typescript
    const restartIce = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
      const pc = peerConnectionRef.current;
      if (!pc) throw new Error('No active peer connection');
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      return offer;
    }, []);
    ```

### 5.3 Client-Side TURN Bandwidth Estimator (`turnQuotaEstimator.ts`)
- [ ] Create `web/src/lib/turnQuotaEstimator.ts`:
  - Implement periodic WebRTC stats inspection via `peerConnection.getStats()`:
    - Inspect active candidate pair (`type === 'candidate-pair' && state === 'succeeded'`).
    - If `remoteCandidate.candidateType === 'relay'` (TURN in use):
      - Read `bytesSent` and `bytesReceived`.
      - Accumulate relayed bytes in `localStorage.getItem('webchat_turn_relayed_bytes')`.
      - If local cumulative monthly usage exceeds 40 GB (80% of 50 GB quota), log a warning and dispatch a custom event `webchat:turn-quota-warning`.

### 5.4 ActiveCallBar Reconnecting Banner & Quality Indicator (`ActiveCallBar.tsx`)
- [ ] In `web/src/components/call/ActiveCallBar.tsx`:
  - Accept prop `callState: CallState`.
  - When `callState === 'reconnecting'`:
    - Display an animated amber badge:
      ```tsx
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-semibold animate-pulse">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Reconnecting network...</span>
      </div>
      ```

### 5.5 Hostinger Reverse Proxy Keep-Alive Hardening (`socket-server/src/index.ts`)
- [ ] In `socket-server/src/index.ts`:
  - Reduce `PING_INTERVAL_MS` from 30,000ms to **25,000ms** (25s) to guarantee traffic stays well below Hostinger's 60-second LiteSpeed/Apache idle connection timeout.
  - Implement immediate socket ping on server-side message reception to maintain keep-alive responsiveness during mobile backgrounding.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 41 complete, verify:
1. **TLS TURN Fallback Verification**:
   - In Chrome DevTools, simulate UDP blocking by blocking UDP ports in firewall or testing behind corporate VPN.
   - Initiate a voice call.
   - Inspect `chrome://webrtc-internals`: active candidate pair connects via `relay` protocol over port 443 TCP.
   - Audio connects and remains clear.
2. **Network Handover & ICE Restart Verification**:
   - Establish an active call between User A and User B.
   - On User A's device, disconnect Wi-Fi to force switch to cellular data.
   - `ActiveCallBar` renders the yellow "Reconnecting..." badge for 1–2 seconds.
   - `restartIce()` completes; the call transitions back to `'connected'` without user manual re-dialing.
3. **Bandwidth Telemetry Verification**:
   - During a relayed call, verify that `turnQuotaEstimator` calculates accumulated bytes from `getStats()`.
4. **Hostinger Proxy Keep-Alive Verification**:
   - Maintain an idle open connection for 10 minutes without sending chat messages.
   - The socket connection does not drop; Fastify metrics confirm continuous active connection.

---

## 7. Handoff to Phase 42
Phase 42 will implement [`42_VOICE_CALL_UI_UX_MODERNIZATION_AND_PERFORMANCE.md`](42_VOICE_CALL_UI_UX_MODERNIZATION_AND_PERFORMANCE.md) to modernize UI encryption tokens, eliminate volume meter React re-render thrashing, and replace browser `alert()` popups with WhatsApp-style toasts.
