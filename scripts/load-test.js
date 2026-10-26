// scripts/load-test.js
// Grafana k6 Virtual User Load Simulation Script for Fastify Native WebSocket Server
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 50 },  // Ramp up to 50 simulated users
    { duration: '30s', target: 150 }, // Ramp up to 150 simulated users
    { duration: '40s', target: 300 }, // Steady state 300 concurrent users
    { duration: '20s', target: 500 }, // Stress peak: 500 concurrent connections
    { duration: '20s', target: 0 },   // Graceful cool down
  ],
  thresholds: {
    ws_connecting: ['p(95)<800'],       // 95% of connections establish under 800ms
    ws_session_duration: ['min>10000'], // Sessions remain connected without drops
    checks: ['rate>0.99'],              // 99%+ checks must pass
  },
};

export default function () {
  const url = __ENV.SOCKET_URL || 'wss://ws.vusigma.com';
  const testToken = __ENV.TEST_JWT_TOKEN || 'valid_test_jwt_cookie';
  const params = {
    headers: {
      Cookie: `auth_token=${testToken}`,
    },
  };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      // Send heartbeat ping envelope every 5s
      socket.setInterval(() => {
        socket.send(
          JSON.stringify({
            type: 'ping',
            payload: { timestamp: Date.now() },
          })
        );
      }, 5000);
    });

    socket.on('message', (raw) => {
      try {
        const data = JSON.parse(raw);
        check(data, {
          'valid envelope received': (d) => d && typeof d.type === 'string',
        });
      } catch {
        // Ignored if non-json
      }
    });

    socket.on('close', () => {
      // Normal close
    });

    socket.on('error', (e) => {
      console.error(`Socket error: ${e.error()}`);
    });

    // Keep session alive for 25 seconds before closing
    socket.setTimeout(() => {
      socket.close();
    }, 25000);
  });

  check(res, {
    'WebSocket handshake status 101': (r) => r && r.status === 101,
  });

  sleep(1);
}
