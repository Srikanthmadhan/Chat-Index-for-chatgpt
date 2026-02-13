# 🚀 Goated Chat Sidebar

A lightweight Chrome Extension (Manifest v3) that injects a dynamic sidebar into chat interfaces and automatically indexes **user messages** for instant navigation.

No freezing.  
No manual refresh.  
No UI lag.  

Just clean, real-time indexing.

---

## ✨ What It Does

- Detects user messages inside chat interfaces
- Extracts the first line of each user prompt
- Builds a dynamic sidebar
- Smooth-scroll navigation to any user message
- Auto-updates when:
  - New messages appear
  - Conversation changes
  - URL changes (SPA navigation)
- Toggle collapse/expand animation
- Safe shadow DOM injection (no CSS conflicts)

---

## 🧠 Why This Exists

Long AI conversations get messy fast.

Scrolling through 50+ messages to find *that one prompt* is pain.

This extension:
- Automatically indexes every user turn
- Creates a quick navigation panel
- Keeps everything synced dynamically

Think of it as a **table of contents for chaos**.

---

## 🏗 Architecture Overview

### Core Components

- **Manifest v3**
- **Service Worker (background.js)**
- **Content Script Injection**
- **Shadow DOM UI**
- **MutationObserver**
- **SPA URL Change Watcher**

---

## ⚙️ How It Works

### 1. Toggle Injection Logic
Prevents multiple instances from running:
```js
if (window._monoSidebarDynamic) { ... }
