# WebChat Technical Architecture, Dependencies & Environment Reference
## Dual-Server Node.js Setup: Next.js 15 Standalone + Fastify & Native `ws`

> This document is the single source of truth for all npm packages, package scripts, environment variables, and runtime configurations for both Server #1 (Frontend/REST) and Server #2 (WebSocket Daemon).

---

## 1. System Overview & Subdomain Topology

| Attribute | Server #1 (Frontend & REST) | Server #2 (Real-Time Daemon) |
| :--- | :--- | :--- |
| **Domain** | `chat.yourdomain.com` | `ws.yourdomain.com` |
| **Framework** | **Next.js 15+ (App Router)** | **Fastify 4+ & Native `ws` (WebSockets)** |
| **Runtime** | Node.js 20 LTS (Standalone Mode) | Node.js 20 LTS (Persistent Daemon) |
| **Default Port** | `3000` (Local) / Hostinger Assigned | `4000` (Local) / Hostinger Assigned |
| **Memory Target** | ~70–120 MB RAM | **~25–35 MB RAM** (Fastify + `ws` ultra-light) |
| **Database Access**| Prisma Client (`connection_limit=10`)| Prisma Client (`connection_limit=10`) |
| **Primary Role** | UI, SSR, Auth, Uploads, PWA, REST | Presence, Live Typing, Messages, Voice Signaling |

---

## 2. Server #1: Frontend (`web/`) Specifications

### 2.1 Dependencies (`package.json`)
```json
{
  "name": "webchat-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^5.22.0",
    "prisma": "^5.22.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.8",
    "lucide-react": "^0.468.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "date-fns": "^4.1.0",
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@types/node": "^20.17.9",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcryptjs": "^2.4.6",
    "tailwindcss": "^3.4.16",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.1.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@playwright/test": "^1.49.1",
    "ts-node": "^10.9.2"
  },
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

### 2.2 Environment Variables (`web/.env.example`)
```env
# ==============================================================================
# SERVER #1: NEXT.JS FRONTEND & REST API ENVIRONMENT CONFIGURATION
# ==============================================================================

# Node Environment
NODE_ENV="development"

# Server Port
PORT=3000

# Base Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Server #2 WebSocket Endpoint (Point to wss://ws.yourdomain.com in production)
NEXT_PUBLIC_SOCKET_URL="ws://localhost:4000"

# Hostinger MySQL Database Connection String (Strictly connection_limit=10)
# Format: mysql://USER:PASSWORD@HOST:3306/DATABASE?connection_limit=10&pool_timeout=20
DATABASE_URL="mysql://u123456789_webchat:YourSecurePassword123@127.0.0.1:3306/u123456789_webchat?connection_limit=10&pool_timeout=20"

# JSON Web Token Secret (Generate using: openssl rand -base64 32)
JWT_SECRET="your_ultra_secure_256_bit_jwt_secret_key_change_in_production"
JWT_EXPIRES_IN="7d"

# Media Storage Configuration (Stored locally on Hostinger NVMe disk)
UPLOAD_DIR="./public/uploads"
NEXT_PUBLIC_UPLOAD_BASE_URL="/uploads"
MAX_IMAGE_SIZE_BYTES=15728640 # 15 MB
MAX_VOICE_SIZE_BYTES=20971520 # 20 MB

# WebRTC STUN & TURN Relay Configuration (Metered.ca Free Tier 50 GB/mo)
NEXT_PUBLIC_STUN_URL="stun:stun.l.google.com:19302"
NEXT_PUBLIC_TURN_URL="turn:relay.metered.ca:80"
NEXT_PUBLIC_TURN_USERNAME="your_metered_turn_username"
NEXT_PUBLIC_TURN_PASSWORD="your_metered_turn_credential"
```

### 2.3 Next.js Standalone Configuration (`web/next.config.js`)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Mandatory for Hostinger Node.js deployment
  images: {
    unoptimized: true, // Uses local LiteSpeed/Nginx static delivery at $0 cost
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

module.exports = nextConfig;
```

---

## 3. Server #2: Real-Time Daemon (`socket-server/`) Specifications

### 3.1 Dependencies (`package.json`)
```json
{
  "name": "webchat-socket-server",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "@fastify/cors": "^9.0.1",
    "@fastify/cookie": "^9.3.1",
    "ws": "^8.18.0",
    "@prisma/client": "^5.22.0",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.4.7",
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@types/node": "^20.17.9",
    "@types/ws": "^8.5.13",
    "@types/jsonwebtoken": "^9.0.7",
    "tsx": "^4.19.2",
    "vitest": "^2.1.8"
  }
}
```

### 3.2 Environment Variables (`socket-server/.env.example`)
```env
# ==============================================================================
# SERVER #2: FASTIFY + NATIVE WS DAEMON ENVIRONMENT CONFIGURATION
# ==============================================================================

# Node Environment
NODE_ENV="development"

# Server Port (Hostinger assigns this via process.env.PORT)
PORT=4000

# Allowed CORS Origin (Point to https://chat.yourdomain.com in production)
CORS_ORIGIN="http://localhost:3000"

# Hostinger MySQL Database Connection String (Strictly connection_limit=10)
DATABASE_URL="mysql://u123456789_webchat:YourSecurePassword123@127.0.0.1:3306/u123456789_webchat?connection_limit=10&pool_timeout=20"

# Shared JWT Secret (MUST match Server #1 JWT_SECRET exactly)
JWT_SECRET="your_ultra_secure_256_bit_jwt_secret_key_change_in_production"

# Heartbeat Ping-Pong Interval in milliseconds
PING_INTERVAL_MS=30000

# Client Typing Throttling in milliseconds (Protects CPU)
TYPING_THROTTLE_MS=2500
```

### 3.3 Fastify + Native `ws` Room Manager Architecture

Native `ws` does not have built-in rooms like Socket.io. We use this lightweight, ultra-fast in-memory pattern:

```typescript
// socket-server/src/lib/roomManager.ts
import { WebSocket } from 'ws';

export interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  username: string;
  isAlive: boolean;
  rooms: Set<string>;
}

export class RoomManager {
  // Map of roomId -> Set of connected WebSockets
  private rooms: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  // Map of userId -> Set of active WebSockets for that user (multiple tabs)
  private userSockets: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  join(room: string, socket: AuthenticatedWebSocket) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(socket);
    socket.rooms.add(room);
  }

  leave(room: string, socket: AuthenticatedWebSocket) {
    if (this.rooms.has(room)) {
      this.rooms.get(room)!.delete(socket);
      if (this.rooms.get(room)!.size === 0) {
        this.rooms.delete(room);
      }
    }
    socket.rooms.delete(room);
  }

  leaveAll(socket: AuthenticatedWebSocket) {
    for (const room of socket.rooms) {
      this.leave(room, socket);
    }
    if (this.userSockets.has(socket.userId)) {
      this.userSockets.get(socket.userId)!.delete(socket);
      if (this.userSockets.get(socket.userId)!.size === 0) {
        this.userSockets.delete(socket.userId);
      }
    }
  }

  registerUser(userId: string, socket: AuthenticatedWebSocket) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  broadcastToRoom(room: string, data: any, excludeSocket?: AuthenticatedWebSocket) {
    const sockets = this.rooms.get(room);
    if (!sockets) return;
    const message = JSON.stringify(data);
    for (const socket of sockets) {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  sendToUser(userId: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    const message = JSON.stringify(data);
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }
}

export const roomManager = new RoomManager();
```

### 3.4 Standardized WebSocket JSON Envelope Protocol
All messages over native `ws` adhere to this structure:
```typescript
export interface WsEnvelope<T = any> {
  type: 
    | 'ping'
    | 'pong'
    | 'user:online'
    | 'user:offline'
    | 'typing:start'
    | 'typing:stop'
    | 'message:send'
    | 'message:new'
    | 'message:status'
    | 'message:reaction'
    | 'message:delete'
    | 'audio-call:invite'
    | 'audio-call:ring'
    | 'audio-call:accept'
    | 'audio-call:reject'
    | 'audio-call:ice-candidate'
    | 'audio-call:end';
  payload: T;
}
```

---

## 4. Shared Library (`shared/`) Specifications

### 4.1 Structure
```text
shared/
├── src/
│   ├── types.ts          # Common entities (User, Message, Chat, Contact, CallLog)
│   ├── events.ts         # WsEnvelope types and event payload interfaces
│   └── constants.ts      # Audio codec, image constraints, timeouts
├── tsconfig.json
└── package.json
```

---

## 5. Hostinger Production Runtime Settings (hPanel)

| Setting | Server #1 (`chat.yourdomain.com`) | Server #2 (`ws.yourdomain.com`) |
| :--- | :--- | :--- |
| **Node.js Version** | 20.x LTS | 20.x LTS |
| **Application Mode**| Production | Production |
| **Application Root**| `/domains/chat.yourdomain.com/public_html` | `/domains/ws.yourdomain.com/public_html` |
| **Startup File** | `server.js` | `dist/index.js` |
| **SSL Certificate** | Let's Encrypt (Free, Auto-renew) | Let's Encrypt (Free, Auto-renew) |
| **Reverse Proxy** | Hostinger Passenger / LiteSpeed | `.htaccess` WebSocket upgrade proxy |
