# Phase 12: Progressive Web App (PWA) & Mobile Chrome Install Experience

## 1. Phase Overview & Objectives
**Target Workspace**: `web/` (Server #1)  
**Primary Goal**: Transform WebChat into a fully downloadable, native-like Progressive Web App (PWA) optimized for Android Mobile Chrome, iOS Safari, and Desktop. Configure the Web App Manifest, implement an offline-capable Service Worker, build an in-app "Install App" promotional banner capturing the Mobile Chrome `beforeinstallprompt` event, and configure mobile viewport ergonomics.

---

## 2. Context & Prerequisites
- **Previous Phase**: [`11_AUDIO_CALLING_WEBRTC_VOICE.md`](11_AUDIO_CALLING_WEBRTC_VOICE.md) (All chat, media, and voice calling features functional).
- **Environment**: Next.js 15, Web App Manifest Specification, Service Worker API, Cache Storage API.
- **Constraints**:
  - PWA installation must function natively in Chrome on Android without requiring an app store account or paid developer license ($0 cost).
  - Must display as a standalone window without browser address bar or navigation chrome.

---

## 3. Architectural Structure & Target Files

```text
web/
├── public/
│   ├── manifest.json                # Web App Manifest specification
│   ├── sw.js                        # Service Worker caching assets & offline fallback
│   ├── offline.html                 # Sleek WhatsApp offline reconnection fallback page
│   └── icons/
│       ├── icon-192x192.png         # Standard Android home screen icon
│       ├── icon-512x512.png         # Splash screen icon
│       └── icon-maskable-512x512.png# Adaptive maskable icon for modern Android Chrome
├── src/
│   ├── app/
│   │   └── layout.tsx               # Injects PWA manifest link & meta viewport tags
│   ├── components/
│   │   └── pwa/
│   │       ├── InstallAppBanner.tsx # Custom in-app "Install on Phone" WhatsApp green banner
│   │       └── ServiceWorkerRegister.tsx # Client component registering sw.js
│   └── hooks/
│       └── usePWAInstall.ts         # Hook capturing beforeinstallprompt event
```

---

## 4. Web App Manifest (`web/public/manifest.json`)

```json
{
  "name": "WebChat Messenger",
  "short_name": "WebChat",
  "description": "Fast, high-performance WhatsApp Web clone",
  "start_url": "/chat",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#111b21",
  "theme_color": "#111b21",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["social", "productivity", "utilities"]
}
```

---

## 5. Detailed Step-by-Step Implementation Tasks

- [ ] **1. PWA Meta Tags in Root Layout (`web/src/app/layout.tsx`)**:
  - Add viewport tag:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    ```
  - Add theme color and manifest links:
    ```html
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#111b21" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="WebChat" />
    ```
- [ ] **2. Service Worker (`web/public/sw.js`)**:
  - Implement cache-first strategy for static assets (`/sounds/*`, `/patterns/*`, `/icons/*`, critical CSS/JS).
  - Implement network-first strategy for dynamic page navigation.
  - If network is completely offline and page is requested, serve `/offline.html` with a retry button.
- [ ] **3. Service Worker Client Registration (`ServiceWorkerRegister.tsx`)**:
  - Register `/sw.js` on `window.load` when supported:
    ```typescript
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js');
    }
    ```
- [ ] **4. In-App Mobile Chrome Install Prompt (`usePWAInstall.ts`)**:
  - Intercept the `beforeinstallprompt` event:
    ```typescript
    let deferredPrompt: any = null;

    export function usePWAInstall() {
      const [isInstallable, setIsInstallable] = useState(false);

      useEffect(() => {
        const handler = (e: any) => {
          e.preventDefault();
          deferredPrompt = e;
          setIsInstallable(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
      }, []);

      const installApp = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setIsInstallable(false);
        deferredPrompt = null;
      };

      return { isInstallable, installApp };
    }
    ```
- [ ] **5. In-App Install Banner Component (`InstallAppBanner.tsx`)**:
  - Render an unobtrusive WhatsApp-style green banner at the top of the sidebar or in the settings drawer:
    - *"📲 Install WebChat on your phone for instant notifications and faster access."*
    - Green button: **"Install App"**.
    - Close button (`✕`) to dismiss banner (persists dismissal in `localStorage` for 7 days).
- [ ] **6. Mobile Chrome Ergonomics**:
  - Prevent pull-to-refresh reload in `web/src/styles/globals.css`:
    ```css
    html, body {
      overscroll-behavior-y: contain;
      height: 100dvh;
      overflow: hidden;
    }
    ```
  - Unlock Web Audio on first touch interaction so ringtones play without browser autoplay policy blocking.

---

## 6. Quality Gate & Verification Criteria

Before marking Phase 12 complete, verify:
1. Running Chrome DevTools > Application > Manifest shows valid manifest properties and green checkmarks for all icons.
2. DevTools > Application > Service Workers shows `/sw.js` registered and active.
3. Simulating mobile device in Chrome DevTools:
   - The "Install WebChat" in-app banner renders.
   - Clicking "Install App" triggers Chrome's native "Add to Home Screen" installation modal.
4. Toggling DevTools to "Offline" and reloading displays the branded offline reconnection screen without a browser crash.

---

## 7. Handoff to Phase 13
Phase 13 will establish the automated testing suite and load simulation (Vitest unit/integration tests, Playwright E2E chat flows, and k6 virtual user simulation for 100–350 users).
