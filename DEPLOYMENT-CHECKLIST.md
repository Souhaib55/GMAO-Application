# 📋 GMAO Docker Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. Docker Environment
- [ ] Docker Desktop is installed
- [ ] Docker Desktop is running
- [ ] Docker version 20.10+ confirmed
- [ ] At least 4GB RAM allocated to Docker
- [ ] At least 10GB disk space available

### 2. Port Availability
Check these ports are free:
- [ ] Port 1433 (SQL Server)
- [ ] Port 4200 (Frontend)
- [ ] Port 5000 (Backend API)
- [ ] Port 5002 (Chatbot Service)

**Check ports:**
```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 1433,4200,5000,5002 -ErrorAction SilentlyContinue
```

### 3. Project Files
- [ ] All Dockerfiles present (API, client, gmaochat)
- [ ] docker-compose.yml exists in root
- [ ] .dockerignore files present
- [ ] nginx.conf in client folder
- [ ] database/init.sql exists

---

## 🚀 Initial Deployment (Local Testing)

### Step 1: Test Docker Setup
```bash
# Verify Docker is working
docker --version
docker-compose --version
docker ps
```

### Step 2: Build and Start Services
```bash
# Navigate to project root
cd c:\Users\souha\Desktop\GMAO

# Start all services (this will take 5-10 minutes first time)
docker-compose up -d --build
```

### Step 3: Monitor Startup
```bash
# Watch the logs
docker-compose logs -f

# Check service status (Ctrl+C to exit logs first)
docker-compose ps
```

All services should show **"Up"** status:
- [ ] gmao-sqlserver (healthy)
- [ ] gmao-backend (Up)
- [ ] gmao-chatbot (Up)
- [ ] gmao-frontend (Up)

### Step 4: Verify Services

#### Database
```bash
docker-compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P YourStrong!Password123 -C -Q "SELECT name FROM sys.databases WHERE name = 'gmao'"
```
✅ Should return "gmao" database

#### Backend API
Open browser: http://localhost:5000/api
✅ Should see API response (or 404 - means API is running)

#### Frontend
Open browser: http://localhost:4200
✅ Should see Angular application

#### Chatbot
Open browser: http://localhost:5002
✅ Should see FastAPI response

---

## 🔍 Troubleshooting Common Issues

### Issue: SQL Server won't start
```bash
# Check logs
docker-compose logs sqlserver

# Common fix: Remove old volume and restart
docker-compose down -v
docker-compose up -d
```

### Issue: Backend can't connect to database
```bash
# Check backend logs
docker-compose logs backend

# Verify SQL Server is healthy
docker-compose ps sqlserver
# Should show "(healthy)" status
```

### Issue: Frontend shows 404 on API calls
1. Check backend is running: `docker-compose ps backend`
2. Check CORS configuration in Program.cs
3. Verify environment.production.ts has correct API URL

### Issue: Port already in use
```bash
# Find what's using the port (example for 5000)
netstat -ano | findstr :5000

# Stop that process or change port in docker-compose.yml
```

---

## 🌐 Server Deployment (Tunisia Server)

### Prerequisites
- [ ] FortiClient VPN connected
- [ ] Remote Desktop access to Tunisia server
- [ ] Docker Desktop installed on server
- [ ] Firewall rules configured (ports 1433, 4200, 5000, 5002)

### Deployment Steps

#### 1. Copy Project to Server
Via RDC:
- [ ] Copy entire GMAO folder to server (e.g., `C:\GMAO`)
- [ ] Verify all files copied correctly

#### 2. Update Configuration for Production

**docker-compose.yml** - Change if needed:
```yaml
environment:
  - SA_PASSWORD=ProductionPassword!2024  # CHANGE THIS!
```

**API/appsettings.Production.json** - Remove sensitive data:
- [ ] Remove OpenAI API key (use environment variable)
- [ ] Remove Deepseek API key (use environment variable)

#### 3. Deploy on Server
```bash
cd C:\GMAO
docker-compose up -d --build
```

#### 4. Verify Deployment
```bash
docker-compose ps
docker-compose logs -f
```

#### 5. Configure Firewall (if needed)
```powershell
# Allow Docker ports
New-NetFirewallRule -DisplayName "GMAO Frontend" -Direction Inbound -LocalPort 4200 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "GMAO Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

#### 6. Access from Network
- Frontend: `http://SERVER_IP:4200`
- Backend: `http://SERVER_IP:5000/api`
- Database: `SERVER_IP:1433`

---

## 🔐 Security Checklist (Production)

### Critical
- [ ] Changed default SA password from `YourStrong!Password123`
- [ ] Updated connection strings with new password
- [ ] Removed API keys from appsettings.Production.json
- [ ] Configured HTTPS (if applicable)
- [ ] Enabled Windows Firewall rules
- [ ] Restricted database access to internal network only

### Recommended
- [ ] Set up automated database backups
- [ ] Configure log retention policy
- [ ] Set up monitoring/alerting
- [ ] Document server access procedures
- [ ] Create backup admin accounts

---

## 📊 Monitoring & Maintenance

### Daily Checks
```bash
# Check service health
docker-compose ps

# Check disk space
docker system df
```

### Weekly Maintenance
```bash
# View logs for errors
docker-compose logs --tail=100

# Clean up unused images
docker system prune -a
```

### Backup Database
```bash
docker-compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P YourPassword -C -Q "BACKUP DATABASE gmao TO DISK='/var/opt/mssql/backup/gmao_backup.bak'"

# Copy backup out of container
docker cp gmao-sqlserver:/var/opt/mssql/backup/gmao_backup.bak ./backup/
```

---

## 📝 Supervisor Demo Checklist

### Before Demo
- [ ] All services running: `docker-compose ps`
- [ ] No errors in logs: `docker-compose logs --tail=50`
- [ ] Frontend loads correctly
- [ ] Test login functionality
- [ ] Verify database contains sample data

### Demo Script
1. **Show Architecture**: Explain docker-compose.yml structure
2. **Access Frontend**: http://SERVER_IP:4200
3. **Test Features**:
   - Login
   - Equipment management
   - Stock management
   - Intervention requests
   - Chatbot interaction
4. **Show Backend**: API responses at http://SERVER_IP:5000/api
5. **Database Access**: Connect using SQL Server Management Studio

### After Demo
- [ ] Answer supervisor questions
- [ ] Document any change requests
- [ ] Plan next steps

---

## 🛠️ Quick Reference Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Restart a service
docker-compose restart backend

# View logs
docker-compose logs -f [service-name]

# Check status
docker-compose ps

# Update after code changes
docker-compose up -d --build [service-name]

# Complete reset (WARNING: deletes data)
docker-compose down -v
docker-compose up -d

# Execute command in container
docker-compose exec backend bash
docker-compose exec sqlserver bash

# View resource usage
docker stats
```

---

## ✅ Final Pre-Demo Checklist

### Technical
- [ ] All 4 containers running and healthy
- [ ] Database initialized with `gmao` database
- [ ] Frontend loads without errors
- [ ] Backend API responds to requests
- [ ] Chatbot service is accessible
- [ ] No errors in any service logs

### Documentation
- [ ] README-DOCKER.md reviewed
- [ ] DOCKER-GUIDE.md available for reference
- [ ] Deployment commands documented
- [ ] Supervisor can access via VPN + RDC

### Presentation
- [ ] Can explain architecture diagram
- [ ] Can demonstrate docker-compose commands
- [ ] Can show logs and monitoring
- [ ] Can explain security measures
- [ ] Prepared for common questions

---

## 🎯 Success Criteria

Your deployment is successful when:
1. ✅ Single command starts entire application
2. ✅ All services communicate correctly
3. ✅ Database persists data between restarts
4. ✅ Application accessible from network
5. ✅ Supervisor can test all features
6. ✅ Logs show no critical errors
7. ✅ Performance is acceptable

---

**Good luck with your deployment! 🚀**
