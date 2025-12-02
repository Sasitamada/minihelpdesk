# 🚀 Quick Start Commands

## ✅ Database Status
- ✅ Connected to Render.com PostgreSQL
- ✅ 4 workspaces found in database
- ✅ All tables ready

## 📋 Step-by-Step Commands

### STEP 1: Open Terminal 1 - Start Backend Server

```bash
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
./START-SERVER.sh
```

**OR manually:**
```bash
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
lsof -ti:5000 | xargs kill -9 2>/dev/null
npm start
```

**Wait for this message:**
```
Server running on port 5000
PostgreSQL/Neon connected successfully
Database tables created or already exist
```

### STEP 2: Open Terminal 2 - Start Frontend Client

```bash
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
./START-CLIENT.sh
```

**OR manually:**
```bash
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
rm -rf node_modules/.cache .cache build
npm start
```

**Wait for this message:**
```
Compiled successfully!
Local: http://localhost:3000
```

### STEP 3: Open Browser

Go to: **http://localhost:3000**

## 🔧 If Port 5000 is Still Busy

Run this command first:
```bash
lsof -ti:5000 | xargs kill -9
```

## ✅ Verify Everything Works

1. **Backend**: Should show "Server running on port 5000"
2. **Database**: Should show "PostgreSQL/Neon connected successfully"
3. **Frontend**: Should open at http://localhost:3000
4. **Workspaces**: Should see your 4 workspaces in the sidebar
5. **Create Workspace**: Click "+ New Workspace" - it should save to database

## 🎯 All Data Storage

Everything is stored in your Render.com database:
- ✅ Workspaces
- ✅ Tasks
- ✅ Users
- ✅ Projects
- ✅ Comments
- ✅ All other data

## 📝 Troubleshooting

**If server won't start:**
```bash
cd /Users/sasitamda/Desktop/minihelpdesk-2/server
lsof -ti:5000 | xargs kill -9
npm start
```

**If client shows errors:**
```bash
cd /Users/sasitamda/Desktop/minihelpdesk-2/client
rm -rf node_modules/.cache .cache build
npm start
```

**If data doesn't appear:**
- Clear browser cache (Cmd+Shift+R)
- Or use Incognito window
