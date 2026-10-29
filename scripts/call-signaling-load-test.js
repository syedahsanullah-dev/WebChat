// scripts/call-signaling-load-test.js
// Grafana k6 Virtual User Load Simulation: 100 Concurrent WebRTC Voice Call Signaling Sessions
// Testing Fastify 4+ & Native ws Daemon (~25-35 MB RAM ceiling on Hostinger CloudLinux)

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics for signaling performance SLA enforcement
const signalingLatency = new Trend('signaling_latency_ms');
const successfulCalls = new Counter('successful_call_sessions');
const failedSignaling = new Counter('failed_signaling_envelopes');

export const options = {
  stages: [
    { duration: '15s', target: 50 },  // Ramp up to 50 virtual users (25 concurrent pairs)
    { duration: '30s', target: 100 }, // Full load: 100 virtual users (50 concurrent call pairs)
    { duration: '30s', target: 100 }, // Steady state sustained load
    { duration: '15s', target: 0 },   // Graceful disconnection cool down
  ],
  thresholds: {
    ws_connecting: ['p(95)<500'],        // 95% of connections establish under 500ms
    signaling_latency_ms: ['p(95)<50'],  // 95% of signaling envelopes roundtrip under 50ms
    checks: ['rate>0.99'],               // 99%+ of assertion checks must pass
    failed_signaling_envelopes: ['count==0'], // Zero unhandled signaling errors allowed
  },
};

export default function () {
  const socketUrl = __ENV.SOCKET_URL || 'ws://localhost:4000';
  const testToken = __ENV.TEST_JWT_TOKEN || 'valid_test_jwt_cookie';

  // Pair determination: 100 VUs form 50 pairs
  const vuId = __VU;
  const pairIndex = Math.floor((vuId - 1) / 2) + 1;
  const isCaller = vuId % 2 === 1;

  const myUserId = isCaller ? `caller-vu-${pairIndex}` : `callee-vu-${pairIndex}`;
  const peerUserId = isCaller ? `callee-vu-${pairIndex}` : `caller-vu-${pairIndex}`;
  const callId = `load-call-pair-${pairIndex}`;
  const chatId = `load-chat-pair-${pairIndex}`;

  const params = {
    headers: {
      Cookie: `auth_token=${testToken}`,
      'X-Test-UserId': myUserId,
      'X-Test-Username': myUserId,
    },
  };

  const res = ws.connect(socketUrl, params, function (socket) {
    let inviteSentTime = 0;
    let iceExchangeCount = 0;

    socket.on('open', () => {
      if (isCaller) {
        // Allow callee to connect before dispatching call invite
        socket.setTimeout(() => {
          inviteSentTime = Date.now();
          const inviteEnvelope = {
            type: 'audio-call:invite',
            payload: {
              callId,
              chatId,
              callerId: myUserId,
              callerName: `Caller ${pairIndex}`,
              callerAvatar: null,
              receiverId: peerUserId,
              sdpOffer: {
                type: 'offer',
                sdp: 'v=0\r\no=k6-load-offer 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111',
              },
            },
          };
          socket.send(JSON.stringify(inviteEnvelope));
        }, 1000);
      }
    });

    socket.on('message', (data) => {
      try {
        const envelope = JSON.parse(data);

        check(envelope, {
          'envelope has valid structure': (e) => e && typeof e.type === 'string',
        });

        // 1. Callee receives incoming call
        if (!isCaller && envelope.type === 'audio-call:incoming') {
          // Immediately send ringing acknowledgment
          socket.send(
            JSON.stringify({
              type: 'audio-call:ring',
              payload: {
                callId: envelope.payload.callId,
                chatId: envelope.payload.chatId,
                callerId: envelope.payload.callerId,
                receiverId: myUserId,
              },
            })
          );

          // Callee accepts call after 500ms
          socket.setTimeout(() => {
            socket.send(
              JSON.stringify({
                type: 'audio-call:accept',
                payload: {
                  callId: envelope.payload.callId,
                  chatId: envelope.payload.chatId,
                  callerId: envelope.payload.callerId,
                  receiverId: myUserId,
                  sdpAnswer: {
                    type: 'answer',
                    sdp: 'v=0\r\no=k6-load-answer 654321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111',
                  },
                },
              })
            );
          }, 500);
        }

        // 2. Caller receives audio-call:accepted
        if (isCaller && envelope.type === 'audio-call:accepted') {
          if (inviteSentTime > 0) {
            const rtt = Date.now() - inviteSentTime;
            signalingLatency.add(rtt);
          }

          // Exchange 4 synthetic ICE candidates over next 4 seconds
          const iceTimer = socket.setInterval(() => {
            iceExchangeCount++;
            socket.send(
              JSON.stringify({
                type: 'audio-call:ice-candidate',
                payload: {
                  callId,
                  chatId,
                  receiverId: peerUserId,
                  candidate: {
                    candidate: `candidate:${iceExchangeCount} 1 UDP 2122260223 127.0.0.1 54321 typ host`,
                    sdpMid: '0',
                    sdpMLineIndex: 0,
                  },
                },
              })
            );

            if (iceExchangeCount >= 4) {
              socket.clearInterval(iceTimer);

              // Maintain call for 5 seconds, then hang up
              socket.setTimeout(() => {
                socket.send(
                  JSON.stringify({
                    type: 'audio-call:end',
                    payload: {
                      callId,
                      chatId,
                      duration: 8,
                      reason: 'completed',
                    },
                  })
                );
                successfulCalls.add(1);
              }, 5000);
            }
          }, 1000);
        }

        // 3. Either peer receives call ended notification
        if (envelope.type === 'audio-call:ended') {
          check(envelope.payload, {
            'call session marked ended': (p) => p && p.callId === callId,
          });
        }
      } catch (err) {
        failedSignaling.add(1);
      }
    });

    socket.on('error', (e) => {
      failedSignaling.add(1);
    });

    socket.on('close', () => {
      // Clean teardown
    });
  });

  check(res, {
    'websocket upgrade succeeded': (r) => r && r.status === 101,
  });

  sleep(1);
}
