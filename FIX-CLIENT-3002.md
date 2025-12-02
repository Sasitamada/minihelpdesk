# Fix for Client on Port 3002

## Issue Found:
- Client is running on `localhost:3002`
- Client is still trying to connect to `localhost:5000` (should be 5001)
- Server CORS updated to allow port 3002

## Solution:

1. **Stop the client** (Ctrl+C in client terminal)

2. **Clear build cache and restart:**
   ```bash
   cd /Users/sasitamda/Desktop/minihelpdesk-2/client
   rm -rf node_modules/.cache
   npm start
   ```

3. **In browser:**
   - Open DevTools (F12)
   - Go to Application tab → Clear Storage → Clear site data
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

4. **Verify API URL in browser console:**
   - After restart, check console for: "API Base URL: http://localhost:5001/api"
   - If it still shows 5000, the client needs a full restart
