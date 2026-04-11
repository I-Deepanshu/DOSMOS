# 🌌 DOSMOS — Product Requirements Document (PRD)

**Tagline:** A deeply personal, private communication universe
**Product Name Meaning:** *DOSMOS = Deepanshu’s Cosmos*

---

# 1. 🎯 Objective

Build a **private, controlled chat platform** where:

* Users can **only communicate with a single designated person (Admin)**
* Admin can **chat with multiple users**
* Authentication is **personalized (DOB + custom question)**
* Experience is **emotional, minimal, and unique** (not like generic chat apps)

---

# 2. 👥 User Roles

## 👑 Admin (Deepanshu)

* Access to all chats
* Can reply to any user
* Manages user identity & authentication

---

## 👤 Users (Invite-only)

* Can only chat with Admin
* Cannot see or interact with other users
* Access via personalized authentication

---

# 3. 🧠 Product Philosophy

* 🔒 Closed ecosystem (no user-to-user chat)
* 💬 One-to-one emotional communication
* 🎨 Experience-first design
* 🧍 Identity-based access (no email/password)

---

# 4. 🔁 User Flows

---

## 4.1 USER FLOW

### Step 1: Entry

* User lands on app
* Sees minimal UI with DOB picker

---

### Step 2: DOB Verification

* User selects DOB via calendar
* Backend checks database

**Outcomes:**

* ❌ No match → Error
* ✅ Match → Proceed

---

### Step 3: Identity Confirmation

Prompt:

> "Are you [Name]?"

* Yes → Continue
* No → Restart

---

### Step 4: Personal Question Authentication

* Display stored personal question
* User submits answer

**Outcomes:**

* ❌ Incorrect → Retry / Fail
* ✅ Correct → Login success

---

### Step 5: Chat Access

* User enters **single chat interface**
* Features:

  * Text messages
  * Image sharing
  * Voice notes
  * GIFs & emojis

**Restrictions:**

* Cannot view other users
* Cannot access multiple chats

---

## 4.2 ADMIN FLOW

### Step 1: Login

* Same authentication flow
* Role detected as ADMIN

---

### Step 2: Dashboard (Universe View)

* Visual representation of users as nodes

---

### Step 3: Chat Management

* Select user → open chat
* Respond to messages
* View chat history

---

# 5. 🧱 Functional Requirements

---

## 5.1 Authentication System

**Inputs:**

* DOB
* Custom answer

**Logic:**

* Match DOB → Fetch user
* Validate answer

**Output:**

* Authenticated session (JWT recommended)

---

## 5.2 Role-Based Access Control

| Role  | Permissions          |
| ----- | -------------------- |
| User  | Chat only with Admin |
| Admin | Chat with all users  |

---

## 5.3 Messaging System

### Supported Message Types:

* Text
* Image
* Audio (voice note)
* GIF
* Emoji

---

### Features:

* Real-time messaging (WebSockets)
* Message timestamps
* Read receipts (optional)
* Typing indicator (optional)

---

## 5.4 Chat Constraints

* Each user → only **1 chat (with Admin)**
* Admin → multiple chats (1 per user)

---

## 5.5 Media Handling

* Images → Cloudinary / S3
* Audio → Blob storage
* GIFs → GIPHY API

---

# 6. 🎨 UX / UI Requirements

---

## 6.1 Design Principles

* Minimal
* Emotional
* Fluid animations
* Non-traditional layout

---

## 6.2 Key Screens

### 1. Entry Screen

* Dark theme
* Centered DOB picker

---

### 2. Identity Screen

* Conversational UI (chat-like authentication)

---

### 3. Chat Screen (User)

* Full-screen single chat
* Floating message bubbles
* Soft gradient background

---

### 4. Admin Dashboard (Universe View)

* Users represented as floating nodes
* Indicators:

  * Unread → glow
  * Online → pulse

---

## 6.3 Interaction Design

* Smooth transitions (Framer Motion)
* Hold-to-record voice input
* Message animations (fade, float)

---

# 7. 🗂️ Data Model

---

## USERS

```
id
name
dob
question
answer_hash
role (admin/user)
theme_preferences
```

---

## CHATS

```
id
user_id
admin_id
created_at
```

---

## MESSAGES

```
id
chat_id
sender_id
type (text/image/audio/gif)
content
created_at
seen_status
```

---

# 8. ⚙️ Technical Architecture

---

## Frontend

* Next.js (React)
* Tailwind CSS
* Framer Motion
* Socket.io Client

---

## Backend

* Node.js + Express
* MongoDB
* Socket.io

---

## Storage

* Cloudinary (images)
* AWS S3 / Firebase (audio)

---

## Authentication

* Custom logic + JWT sessions

---

# 9. 🔐 Security Considerations

* Store answers as hashed values
* Rate-limit authentication attempts
* JWT expiry & refresh strategy
* Strict API access control

---

# 10. 🚀 MVP Scope

---

## Phase 1 (Core)

* DOB + question authentication
* Basic text chat
* Admin dashboard (simple list)

---

## Phase 2

* Real-time messaging
* Image sharing
* UI enhancements

---

## Phase 3

* Voice notes
* GIF support
* Advanced animations

---

## Phase 4

* Personalization engine
* User-specific themes

---

# 11. 📊 Success Metrics

* Daily active users (DAU)
* Messages per user
* Avg session duration
* Authentication success rate

---

# 12. ⚠️ Risks & Mitigation

| Risk                | Mitigation                |
| ------------------- | ------------------------- |
| Weak authentication | Strong personal questions |
| Unauthorized access | Strict backend validation |
| Scaling issues      | WebSocket scaling (Redis) |
| Storage cost        | Media compression         |

---

# 13. 🔮 Future Enhancements

* AI-assisted replies
* Memory timeline (shared moments)
* Scheduled messages
* Voice-to-text

---

# ✅ Final Summary

**DOSMOS is not just a chat app.**

It is a **private digital universe** where:

* One person is the center
* Every conversation is personal
* Every interaction feels intentional

---
