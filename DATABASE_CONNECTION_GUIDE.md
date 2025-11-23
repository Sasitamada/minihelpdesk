# Database Connection Guide - Render.com PostgreSQL

## 📋 Database Details

Your MiniHelpDesk project is now connected to a Render.com PostgreSQL database:

- **Hostname:** `dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com`
- **Port:** `5432`
- **Database:** `helpdesk_db_avyz`
- **Username:** `helpdesk_db_avyz_user`
- **Password:** `kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I`

## 🔌 Terminal Commands to Connect to Database

### Option 1: Using psql (PostgreSQL Command Line)

**Windows (PowerShell/CMD):**
```powershell
$env:PGPASSWORD="kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I"
psql -h dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com -p 5432 -U helpdesk_db_avyz_user -d helpdesk_db_avyz
```

**Windows (One-liner):**
```cmd
set PGPASSWORD=kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I && psql -h dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com -p 5432 -U helpdesk_db_avyz_user -d helpdesk_db_avyz
```

**Linux/Mac:**
```bash
PGPASSWORD=kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I psql -h dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com -p 5432 -U helpdesk_db_avyz_user -d helpdesk_db_avyz
```

### Option 2: Using Connection String

**Windows (PowerShell):**
```powershell
$env:PGPASSWORD="kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I"
psql "postgresql://helpdesk_db_avyz_user:kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I@dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com:5432/helpdesk_db_avyz"
```

**Linux/Mac:**
```bash
psql "postgresql://helpdesk_db_avyz_user:kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I@dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com:5432/helpdesk_db_avyz"
```

### Option 3: Using pgAdmin or DBeaver

1. **Host/Server:** `dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com`
2. **Port:** `5432`
3. **Database:** `helpdesk_db_avyz`
4. **Username:** `helpdesk_db_avyz_user`
5. **Password:** `kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I`
6. **SSL Mode:** `require` or `prefer`

## 📊 Useful SQL Commands After Connecting

Once connected, you can run these commands:

```sql
-- List all tables
\dt

-- View all workspaces
SELECT * FROM workspaces;

-- View all projects
SELECT * FROM projects;

-- View all tasks
SELECT * FROM tasks;

-- View all users
SELECT * FROM users;

-- Count records in each table
SELECT 
  'workspaces' as table_name, COUNT(*) as count FROM workspaces
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'comments', COUNT(*) FROM comments;

-- Exit psql
\q
```

## 🔧 Troubleshooting Connection Issues

### Issue: "psql: command not found"
**Solution:** Install PostgreSQL client tools:
- **Windows:** Download from https://www.postgresql.org/download/windows/
- **Mac:** `brew install postgresql`
- **Linux:** `sudo apt-get install postgresql-client` (Ubuntu/Debian)

### Issue: "Connection refused" or "Timeout"
**Solution:** 
1. Check if your IP is allowed in Render.com's IP restrictions
2. Verify the hostname and port are correct
3. Ensure SSL is enabled (Render.com requires SSL)

### Issue: "Password authentication failed"
**Solution:**
1. Double-check the password (case-sensitive)
2. Ensure there are no extra spaces in the connection string
3. Try using the connection string format instead

## ✅ Verify Connection from Application

After starting your server, you should see:
```
PostgreSQL/Neon connected successfully
Database tables created or already exist
Server running on port 5000
```

If you see connection errors, check:
1. The `.env` file exists in the `server/` folder
2. The `DATABASE_URL` in `.env` is correct
3. Your network allows connections to Render.com

## 🎯 Quick Test Connection

**Windows PowerShell:**
```powershell
cd server
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL||'postgresql://helpdesk_db_avyz_user:kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I@dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com/helpdesk_db_avyz',ssl:{rejectUnauthorized:false}});p.query('SELECT NOW()').then(r=>{console.log('✅ Connected!',r.rows[0]);p.end()}).catch(e=>{console.error('❌ Error:',e.message);p.end()})"
```

**Linux/Mac:**
```bash
cd server
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'postgresql://helpdesk_db_avyz_user:kUc1OsIzdy2aFRpzyKm47CFeRpDvbb0I@dpg-d4fmlouuk2gs73ffefn0-a.oregon-postgres.render.com/helpdesk_db_avyz',ssl:{rejectUnauthorized:false}});p.query('SELECT NOW()').then(r=>{console.log('✅ Connected!',r.rows[0]);p.end()}).catch(e=>{console.error('❌ Error:',e.message);p.end()})"
```

---

**All your MiniHelpDesk data (workspaces, projects, tasks, comments, users) will be stored in this Render.com PostgreSQL database!** 🎉

