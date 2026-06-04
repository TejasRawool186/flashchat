# FlashChat Transformation — Task Tracker

## Day 1: Foundation & Architecture

### Setup
- [x] Install client dependencies (react-router-dom, typescript, types, etc.)
- [x] Configure TypeScript (tsconfig.json)
- [x] Create type definitions (types/index.ts)
- [x] Set up environment variables (.env, .env.example)

### Component Decomposition
- [x] Create component directory structure
- [x] Extract SplashScreen component
- [x] Extract HomeScreen component
- [x] Extract ChatScreen (main layout)
- [x] Extract ChatHeader component
- [x] Extract MessageList component
- [x] Extract MessageBubble component
- [x] Extract CodeMessage component (rendered via syntax highlighter in MessageBubble)
- [x] Extract ImageMessage component (integrated in MessageBubble)
- [x] Extract FileMessage component (integrated in MessageBubble)
- [x] Extract InputBar component
- [x] Extract Sidebar component
- [x] Extract AttachmentPicker modal
- [x] Extract ImageViewer modal
- [x] Extract Notification component
- [x] Extract DropZone component
- [x] Extract utility functions (lib/utils.ts)
- [x] Rewrite App.tsx as thin router shell
- [x] Rewrite main.tsx with BrowserRouter
- [x] Migrate socket.js → lib/socket.ts

### React Router v6
- [x] Set up routes (/, /chat/:roomCode)
- [x] Implement navigation with useNavigate
- [x] Handle direct URL access to /chat/:roomCode

### E2E Encryption
- [x] Create crypto.ts (Web Crypto API utilities)
- [x] E2E Crypto integration in ChatScreen.tsx
- [x] Add key-exchange socket events on server
- [x] Integrate encryption into message send/receive
- [x] Add encryption UI indicators (lock icon, badge)

### Security Hardening
- [x] Add rate limiting middleware (server)
- [x] Add input sanitization (DOMPurify/cheerio)
- [x] Fix XSS vulnerability (dangerouslySetInnerHTML)
- [x] Configure CORS with environment variables
- [x] Add CSP headers

### Performance
- [x] Remove/replace 2.8 MB world-map.svg
- [x] Fix CSS typo (line 99 stray `s`)

---

## Day 2: Features
- [x] QR Code room sharing modal
- [x] Emoji picker integration
- [x] Message reactions system
- [x] Quote-reply functionality
- [x] Read receipts (sent/delivered/read)
- [x] DiceBear avatars
- [x] Functional sidebar (search, user list, room info)
- [x] Markdown rendering (react-markdown)
- [x] Link previews (server-side OG fetching)

---

## Day 3: Polish & Ship
- [x] UI polish & animations
- [ ] Deploy to Vercel (frontend) (Triggered - building on push)
- [ ] Deploy to Hostinger VPS (backend) (Manual setup checklist ready)
- [x] GitHub Actions CI/CD pipeline
- [x] Premium README
- [ ] Final testing
- [x] (Stretch) AI Chat Assistant
