# ⚡ FlashChat v2.0 — Walkthrough & Verification

This walkthrough summarizes the structural audit, migration, security enhancements, and feature completions done during the sprint.

---

## 🛠️ Key Architectural Changes

1. **TypeScript Migration & God File Decomposition**
   - Extracted the monolithic `client/src/App.jsx` (825 lines) and `client/src/socket.js` into **17 type-safe components** and modules.
   - Built a comprehensive types system in [types/index.ts](file:///d:/FlashChat/client/src/types/index.ts).
   - Removed old, unused files (`App.jsx`, `main.jsx`, `socket.js`) to keep the codebase pristine.

2. **React Router v6 Navigation**
   - Configured shareable routes inside [App.tsx](file:///d:/FlashChat/client/src/App.tsx):
     - `/`: HomeScreen room selection/creation.
     - `/chat/:roomCode`: Direct encrypted chat room view.
     - Intercepted direct links: if a user visits `/chat/ABCDEF` directly without a username, they are prompted inline to enter their name before joining.

3. **Client-Side E2E Encryption**
   - Designed E2E encryption in [crypto.ts](file:///d:/FlashChat/client/src/lib/crypto.ts) using the native **Web Crypto API** (AES-256-GCM).
   - Derived cryptographic keys securely on the client from the room code. The server only relays the encrypted ciphertexts; it never receives plaintext.

4. **Security Hardening**
   - Integrated `helmet` and `express-rate-limit` (100 reqs/15m) on the Express backend.
   - Implemented per-socket rate limiting (max 30 messages/minute) with custom error relays.
   - Added input sanitization (stripping HTML/scripts) client-side (`rehype-sanitize` inside ReactMarkdown) and server-side.

5. **Performance Optimizations**
   - Removed a massive **2.8 MB background SVG** (`world-map.svg`) which choked loading.
   - Replaced it with a lightweight, premium CSS radial dots grid pattern.
   - Fixed a compilation-breaking stray `s` typo on line 99 of the stylesheet.

---

## 🚀 Decomposed Client Component Tree

The frontend is now modularized under `client/src/components`:
- **`shared/`**:
  - [Avatar.tsx](file:///d:/FlashChat/client/src/components/shared/Avatar.tsx): Generates DiceBear avatars based on name seed with colored fallback initials.
  - [Notification.tsx](file:///d:/FlashChat/client/src/components/shared/Notification.tsx): Toast notifications auto-hiding after 3 seconds.
  - [DropZone.tsx](file:///d:/FlashChat/client/src/components/shared/DropZone.tsx): Visual overlay when dragging files into the chat area.
- **`modals/`**:
  - [AttachmentPicker.tsx](file:///d:/FlashChat/client/src/components/modals/AttachmentPicker.tsx): Modal choosing documents, images, archive uploads, or snippet modes.
  - [ImageViewer.tsx](file:///d:/FlashChat/client/src/components/modals/ImageViewer.tsx): Full-screen viewport overlay.
  - [QRShareModal.tsx](file:///d:/FlashChat/client/src/components/modals/QRShareModal.tsx): Displays a dynamic room code QR code SVG using `qrcode.react`, with URL copying and native web share support.
- **`chat/`**:
  - [ChatScreen.tsx](file:///d:/FlashChat/client/src/components/chat/ChatScreen.tsx): The central chat orchestrator managing socket streams, E2E crypto cycles, and child component actions.
  - [ChatHeader.tsx](file:///d:/FlashChat/client/src/components/chat/ChatHeader.tsx): Displays room information, device count, E2E encryption badges, and controls.
  - [MessageList.tsx](file:///d:/FlashChat/client/src/components/chat/MessageList.tsx): Lists bubbles with smart grouping, scroll anchors, and unread countdown flags.
  - [MessageBubble.tsx](file:///d:/FlashChat/client/src/components/chat/MessageBubble.tsx): Renders files, images, syntax-highlighted code blocks, and markdown text securely.
  - [InputBar.tsx](file:///d:/FlashChat/client/src/components/chat/InputBar.tsx): Controls inputs, attachments, code views, emojis, and quote-replies.
  - [ReactionBar.tsx](file:///d:/FlashChat/client/src/components/chat/ReactionBar.tsx): Displays reaction summaries and popovers on hover.
  - [LinkPreview.tsx](file:///d:/FlashChat/client/src/components/chat/LinkPreview.tsx): Captures links and renders rich OG metadata previews.

---

## 🔬 Testing & Validation Results

1. **TypeScript Type Safety Check**
   - Verified utilizing `npx tsc --noEmit` on the client directory:
     ```bash
     npx tsc --noEmit
     # Compiled successfully with exit code 0.
     ```

2. **Production Bundle Verification**
   - Ran Vite production packaging:
     ```bash
     npm run build
     # dist/assets/index-Lkqzrx7W.css     23.31 kB
     # dist/assets/index-pvnN9rvR.js   1,438.32 kB
     # ✓ built in 7.06s
     ```

3. **Backend Service Health Check**
   - Started and tested the server boot sequence locally:
     ```
     🚀 FlashChat server v2.0 running on port 3001
        CORS origins: http://localhost:5173, http://127.0.0.1:5173
        Room timeout: 30 minutes
        Rate limit: 30 msgs/min per socket
     ```
