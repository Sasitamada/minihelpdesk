# 🚀 Quick Install & Start Guide

## Prerequisites
✅ Node.js installed
✅ Render.com PostgreSQL database (already configured)

---

## Step 1: Create .env File

**Important:** In the `server` folder, create a file named `.env` with this content:

```env
PORT=5000
DATABASE_URL=postgresql://helpdesk_db_avyz_user:kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I@dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com/helpdesk_db_avyz
JWT_SECRET=minihelpdesk_super_secret_jwt_key_2024
```

---

## Step 2: Install Dependencies

### Backend (Server):
```bash
cd server
npm install
```

### Frontend (Client):
```bash
cd client
npm install
```

---

## Step 3: Start the Application

### Terminal 1 - Backend:
```bash
cd server
npm start
```
**Runs on:** http://localhost:5000

### Terminal 2 - Frontend:
```bash
cd client
npm start
```
**Runs on:** http://localhost:3000

---

## Step 4: Access the Application

1. Open browser: **http://localhost:3000**
2. You'll see the **Login page**
3. **Sign Up** to create an account, or **Sign In** if you have one
4. After login, you'll see the **Dashboard**

---

## 🎉 What You Can Do Now:

1. **Create Workspace** - Click "+ New Workspace" in sidebar
2. **Create Project** - Select workspace, create projects
3. **Add Tasks** - Create tasks with priority, due dates, subtasks
4. **Kanban Board** - Drag and drop tasks
5. **Settings** - Click Settings button to manage profile
6. **Dashboard** - View statistics and charts

---

## 🔐 Authentication Features:

- ✅ Sign Up with email/password
- ✅ Login with credentials
- ✅ Protected routes (must login to access)
- ✅ Settings page with profile management
- ✅ Password change
- ✅ Two-factor authentication (2FA) setup

---

## ⚠️ First Time Users:

**Default Login:**
- After signup, use your email and password to login
- No default credentials - you must sign up first

---

## 📝 Notes:

- All data is stored in your Render.com PostgreSQL database
- Settings are saved locally in browser
- Logout: Clear browser localStorage or clear data

Enjoy your MiniHelpDesk! 🚀
