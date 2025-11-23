# 🚀 MiniHelpDesk - Project Management Tool

A beautiful project management application with instant access and optional authentication.

## 🎯 Quick Start

### 1. Create `.env` File in `server/` folder:

```env
PORT=5000
DATABASE_URL=postgresql://helpdesk_db_avyz_user:kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I@dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com/helpdesk_db_avyz
JWT_SECRET=minihelpdesk_super_secret_jwt_key_2024
```

### 2. Install & Start

```bash
# Terminal 1 - Backend
cd server
npm install
npm start

# Terminal 2 - Frontend
cd client
npm install
npm start
```

### 3. Open Browser

**http://localhost:3000**

---

## ✨ Landing Page Features

### Beautiful Design
- **Soft gradient background** (lavender to light purple)
- **"Get Started. It's FREE!"** button in center**
- **Log In** and **Sign Up** buttons in top right corner
- Clean, minimalist design

### Instant Access
- Click "Get Started" → Go straight to dashboard
- **NO login required** to use the app
- Start working immediately

### Optional Authentication
- Click "Log In" or "Sign Up" for optional account creation
- Opens modal for authentication
- Secondary feature - not blocking

---

## 📋 Features

### Core Features
✅ Dashboard with analytics and charts
✅ Workspace & Project management
✅ Task creation with Kanban board
✅ Drag-and-drop functionality
✅ Priority levels and due dates
✅ Subtasks and comments
✅ Search and filtering
✅ Settings page with 2FA options

### UI/UX
✅ Professional ClickUp-like design
✅ Responsive mobile layout
✅ Smooth animations
✅ Beautiful landing page
✅ Instant access without authentication

---

## 🔗 Routes

- `/` - Landing page (default)
- `/dashboard` - Main dashboard
- `/workspaces` - Workspace management
- `/settings` - Settings page
- `/project/:id` - Project view

---

## 🗄️ Database

All data is stored in **Render.com PostgreSQL** (cloud database)
- Workspaces
- Projects
- Tasks
- Comments
- Users (optional)

**Database Details:**
- Host: dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com
- Port: 5432
- Database: helpdesk_db_avyz

---

## 🎨 Design Details

### Landing Page
- Gradient: #f8f9ff to #e8ecff
- Get Started button: Purple gradient (#6b5ce6 to #9b59b6)
- Login button: Transparent with white border
- Sign Up button: Purple gradient

### Main App
- Modern sidebar navigation
- Professional header
- Beautiful cards and layouts
- Responsive design

---

## 🚀 Usage Flow

1. **Open** http://localhost:3000
2. **See** Beautiful landing page
3. **Click** "Get Started"
4. **Access** Dashboard instantly (no login required)
5. **Optional:** Click Login/Sign Up for account creation

---

## 📝 Notes

- Workspaces, tasks saved to Render.com PostgreSQL database
- Settings saved in browser localStorage
- Authentication is optional
- All features work without login

---

## 🎉 Enjoy MiniHelpDesk!

Built with ❤️ using React and Express.js"# mini_helpdesk-server" 
