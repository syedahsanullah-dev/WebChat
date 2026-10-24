# Phase 03: Authentication & Profile System (Username & Email)

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1)  
**Primary Goal**: Build the complete authentication and profile customization system based strictly on **`@username`** and **`email`** (completely omitting phone numbers). Implement user registration, debounced username availability checking, dual login, HTTP-only JWT session management, route protection middleware, and the WhatsApp-style profile drawer.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`02_DATABASE_AND_DUAL_SERVER_SETUP.md`](02_DATABASE_AND_DUAL_SERVER_SETUP.md) (MySQL database running, Prisma client generated, `User` table created).
- **Environment**: Next.js 15 App Router, bcryptjs / argon2, jsonwebtoken.
- **Strict Guardrail**:
  - **No phone numbers anywhere**: Do not introduce phone fields or SMS verification.
  - Profile avatar upload must save directly to `web/public/uploads/avatars/` on Hostinger NVMe (0 paid cloud buckets).

---

## 3. Architectural Structure & Target Files

```text
web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx         # Login page (accepts email OR @username)
│   │   │   ├── register/
│   │   │   │   └── page.tsx         # Registration page with live username availability
│   │   │   └── layout.tsx           # Centered WhatsApp auth card wrapper
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── register/
│   │   │       │   └── route.ts     # POST /api/auth/register
│   │   │       ├── login/
│   │   │       │   └── route.ts     # POST /api/auth/login
│   │   │       ├── logout/
│   │   │       │   └── route.ts     # POST /api/auth/logout
│   │   │       ├── me/
│   │   │       │   └── route.ts     # GET /api/auth/me (current user payload)
│   │   │       └── check-username/
│   │   │           └── route.ts     # GET /api/auth/check-username?q=username
│   │   │   └── users/
│   │   │       └── profile/
│   │   │           ├── route.ts     # PATCH /api/users/profile (display name, bio)
│   │   │           └── avatar/
│   │   │               └── route.ts # POST /api/users/profile/avatar (local file upload)
│   ├── components/
│   │   └── profile/
│   │       └── ProfileDrawer.tsx    # Slide-over WhatsApp profile viewer and editor
│   ├── lib/
│   │   ├── auth.ts                  # JWT token sign, verify & cookie helpers
│   │   └── validations.ts           # Zod validation schemas for registration/login
│   └── middleware.ts                # Next.js route protection middleware
```

---

## 4. API Contracts & Data Specifications

### 1. Username Availability Check (`GET /api/auth/check-username?q=alex`)
- **Query Params**: `q` (string, lowercase)
- **Response**:
  ```json
  { "available": true, "username": "alex" }
  ```
- **Error Response (`400`)**: If username fails regex `^[a-zA-Z0-9_]{3,25}$`.

### 2. Registration (`POST /api/auth/register`)
- **Request Body**:
  ```json
  {
    "displayName": "Alex Turner",
    "username": "alex_t",
    "email": "alex@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Validation**:
  - `displayName`: 2–50 characters.
  - `username`: 3–25 characters, alphanumeric and underscore only.
  - `email`: valid RFC email format.
  - `password`: minimum 8 characters with at least one number.
- **Response (`201`)**: Sets HTTP-only `auth_token` cookie and returns `{ "user": { ... } }`.

### 3. Dual Login (`POST /api/auth/login`)
- **Request Body**:
  ```json
  {
    "identifier": "alex_t", // Can be either "alex_t" OR "alex@example.com"
    "password": "SecurePassword123"
  }
  ```
- **Logic**: Resolves user where `username === identifier.toLowerCase()` OR `email === identifier.toLowerCase()`.

### 4. Avatar Upload (`POST /api/users/profile/avatar`)
- **Content-Type**: `multipart/form-data`
- **File constraints**: Images only (`image/png`, `image/jpeg`, `image/webp`), max 5MB.
- **Storage**: Saves file to `public/uploads/avatars/[uuid].webp` and updates `User.avatarUrl`.

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. Authentication Utilities & Validation Schemas**:
  - Create `web/src/lib/validations.ts` defining Zod schemas for `RegisterSchema`, `LoginSchema`, and `ProfileSchema`.
  - Create `web/src/lib/auth.ts`:
    - `signToken(payload)`: Signs JWT using `JWT_SECRET` with 7-day expiration.
    - `verifyToken(token)`: Verifies and decodes JWT.
    - `setAuthCookie(response, token)`: Sets `auth_token` cookie with `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`.
    - `clearAuthCookie(response)`: Clears cookie.
- [ ] **2. Auth REST API Endpoints**:
  - `POST /api/auth/register`: Hashes password with `bcrypt.hash(password, 12)`, creates user in MySQL via Prisma, sets cookie, returns sanitized user.
  - `POST /api/auth/login`: Verifies user password with `bcrypt.compare`, sets cookie.
  - `POST /api/auth/logout`: Clears cookie and returns `{ "success": true }`.
  - `GET /api/auth/me`: Returns currently logged-in user profile without `passwordHash`.
  - `GET /api/auth/check-username`: Fast indexed query on `User.username`.
- [ ] **3. Route Protection Middleware**:
  - Implement `web/src/middleware.ts`:
    - If user visits `/chat/*` without valid `auth_token`, redirect to `/login`.
    - If user visits `/login` or `/register` with valid `auth_token`, redirect to `/chat`.
- [ ] **4. Auth UI Pages**:
  - Build `web/src/app/(auth)/register/page.tsx`:
    - WhatsApp branded dark card with WhatsApp logo.
    - Live debounced check: Shows green checkmark `"@username is available"` or red warning.
  - Build `web/src/app/(auth)/login/page.tsx`:
    - Single identifier input (`"Username or Email"`) and password input.
    - Error banners on invalid credentials.
- [ ] **5. Profile & Settings Drawer**:
  - Build `web/src/components/profile/ProfileDrawer.tsx`:
    - Slide-in panel from left (replaces conversation list).
    - Big circular avatar with hover camera overlay to trigger file upload dialog.
    - Editable Display Name and Bio/About (with preset options: *"Available"*, *"Busy"*, *"At work"*).
    - Read-only fields showing `@username` and `email` with a lock icon.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 03 complete, verify:
1. Navigating to `http://localhost:3000/chat` when logged out redirects to `/login`.
2. Registering an account with `@testuser` creates a record in MySQL and redirects to `/chat`.
3. Logging out clears the cookie and redirects to `/login`.
4. Logging in with both `testuser` and `testuser@example.com` works seamlessly.
5. Uploading an avatar image saves the file into `web/public/uploads/avatars/` and updates the avatar in the UI immediately.

---

## 7. Handoff to Phase 04
Phase 04 will build the Contact Discovery & Address Book module in `web/` (prefix search for `@username`, contact cards, adding contacts, and starting direct conversations).
