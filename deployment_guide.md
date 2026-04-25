# DOSMOS Deployment Guide

DOSMOS is composed of two drastically different engines:
1. **Frontend**: Static/SSR React components (Next.js)
2. **Backend**: A persistent streaming engine managing real-time Socket.io connections & MongoDB models.

Since the backend relies on **WebSockets**, you **cannot** deploy the backend on Vercel (Vercel uses Serverless functions which kill WebSocket connections instantly). 

Therefore, the premium stack for this app is **Frontend on Vercel** and **Backend on Render** (or Railway).

---

## Phase 1: Deploying the Backend (Render.com)

Render provides a completely free tier for persistent Node.js servers, explicitly supporting WebSockets.

### 1. Push to GitHub
Create a new GitHub repository for `DOSMOS`. Push your entire project to it.

### 2. Connect to Render
1. Go to [Render.com](https://render.com) and sign in.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select the `DOSMOS` repository.

### 3. Configure the Build
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start` (or `node server.js` / whatever starts your express server)

### 4. Setup Environment Variables
Under the **Environment** tab on Render, punch in the identical variables from your local `.env`:

```ini
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://your-vercel-project.vercel.app  # (We will set this up shortly)
MONGODB_URI=mongodb+srv://...           # Your Atlas URI
JWT_SECRET=super_secret_access_token
JWT_REFRESH_SECRET=super_secret_refresh_token
JWT_STEP_SECRET=super_secret_step_token
BCRYPT_ROUNDS=12
ADMIN_NAME=Commander
ADMIN_DOB=2000-01-01
ADMIN_QUESTION=What is the name of your childhood pet?
ADMIN_ANSWER=cosmos
REGISTRATION_THRESHOLD=2
```

### 5. Deploy Database
1. Go to **MongoDB Atlas**.
2. Click **Network Access** under Security.
3. Add IP Address: `0.0.0.0/0` (Allow access from anywhere, so Render can connect dynamically).
4. Run your Render build! Once finished, Render will assign you a live URL like `https://dosmos-api.onrender.com`.

---

## Phase 2: Deploying the Frontend (Vercel)

Vercel natively digests Next.js and deploys it automatically at the Edge.

### 1. Import to Vercel
1. Go to [Vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import the exact same `DOSMOS` GitHub repository.

### 2. Configure the Framework
- **Root Directory**: Click "Edit" and type `frontend`. This tells Vercel where the Next.js app lives!
- **Framework Preset**: Vercel will auto-detect "Next.js".

### 3. Add Environment Variables
In the Environment Variables section on Vercel, link your new live Backend:

| Name | Value |
| :--- | :--- |
| `NEXT_PUBLIC_BACKEND_URL` | `https://dosmos-api.onrender.com` |

### 4. Deploy
Hit **Deploy**. Vercel will run `next build`. We successfully solved the TypeScript `Expected a semicolon` parsing error just prior to this, so Vercel will achieve a flawless build sequence.

When finished, Vercel will give you a domain (e.g., `https://dosmos-chat.vercel.app`).

---

## Phase 3: Final Security Shake

Now that Vercel is live, you must tell the backend to trust it!

1. Go back to your **Render Backend Settings**.
2. Edit the `FRONTEND_URL` environment variable.
3. Set it perfectly to: `https://dosmos-chat.vercel.app` *(Make sure there is NO trailing slash!)*
4. Restart the Render Web Service.

> [!CAUTION]
> If `FRONTEND_URL` in the backend does not exactly match the domain you visit the frontend on, CORS policies will instantly block all login and Socket.io attempts!

---

### Verification
1. Load your Vercel URL on your phone.
2. Submit a registration form as an unknown User.
3. Open a separate tab on desktop, complete the Admin flow.
4. Open the DOSMOS Dashboard (`/admin`) and watch the planetary data stream in real-time over the cloud!
