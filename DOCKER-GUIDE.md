# GMAO Docker Deployment Guide

## 📋 Overview

This project is fully Dockerized for easy deployment. All services run in isolated containers and communicate through a Docker network.

## 🏗️ Architecture

```
gmao-network (Docker Network)
│
├── sqlserver (Port 1433)
│   └── Database: gmao
│
├── backend (Port 5000)
│   └── .NET 9.0 API
│
├── chatbot (Port 5002)
│   └── Python FastAPI Service
│
└── frontend (Port 4200)
    └── Angular 16 + Nginx
```

## 📦 Services

| Service | Container Name | Port | Technology |
|---------|---------------|------|------------|
| SQL Server | gmao-sqlserver | 1433 | Microsoft SQL Server 2022 |
| Backend API | gmao-backend | 5000 | .NET 9.0 |
| Chatbot | gmao-chatbot | 5002 | Python 3.11 + FastAPI |
| Frontend | gmao-frontend | 4200 | Angular 16 + Nginx |

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Minimum 4GB RAM available for Docker
- Ports 1433, 4200, 5000, 5002 must be available

### 1. Build and Start All Services

```bash
docker-compose up -d
```

This single command will:
- Build all Docker images
- Create the Docker network
- Start SQL Server and wait for it to be ready
- Start the backend API
- Start the chatbot service
- Start the frontend

### 2. Check Service Status

```bash
docker-compose ps
```

All services should show "Up" status.

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f sqlserver
docker-compose logs -f chatbot
```

### 4. Access the Application

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:5000/api
- **Chatbot**: http://localhost:5002
- **SQL Server**: localhost:1433
  - User: `sa`
  - Password: `YourStrong!Password123`
  - Database: `gmao`

## 🛠️ Common Commands

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove Volumes (Reset Database)
```bash
docker-compose down -v
```

### Rebuild Services
```bash
docker-compose up -d --build
```

### Restart a Specific Service
```bash
docker-compose restart backend
```

### View Resource Usage
```bash
docker stats
```

## 🗄️ Database Migrations

The backend will automatically apply Entity Framework migrations on startup. To manually run migrations:

```bash
docker-compose exec backend dotnet ef database update
```

## 🔍 Troubleshooting

### Backend can't connect to SQL Server
```bash
# Check if SQL Server is healthy
docker-compose ps sqlserver

# Check SQL Server logs
docker-compose logs sqlserver
```

### Frontend can't reach backend
- Verify backend is running: `docker-compose ps backend`
- Check backend logs: `docker-compose logs backend`
- Ensure CORS is properly configured

### Port conflicts
If ports are already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "5001:80"  # Change 5000 to 5001 for backend
```

### Rebuild specific service
```bash
docker-compose up -d --build backend
```

## 🌐 Deployment on Server

When deploying to your Tunisia server via VPN and RDC:

1. **Copy the entire GMAO folder** to the server

2. **Update docker-compose.yml** with server IPs (if needed):
   ```yaml
   environment:
     - ASPNETCORE_URLS=http://+:80
   ```

3. **Run on server**:
   ```bash
   docker-compose up -d
   ```

4. **Access from your network**:
   - Frontend: `http://SERVER_IP:4200`
   - Backend: `http://SERVER_IP:5000`

## 🔐 Security Notes

### For Production Deployment:

1. **Change the default SA password** in `docker-compose.yml`:
   ```yaml
   SA_PASSWORD: "YourProductionPassword!2024"
   ```

2. **Update connection strings** in `docker-compose.yml` backend environment

3. **Remove sensitive data** from `appsettings.Production.json` (API keys, etc.)

4. **Use Docker secrets** for sensitive values

5. **Configure firewall rules** on the server

## 📁 Project Structure

```
GMAO/
├── API/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── appsettings.Production.json
├── client/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── gmaochat/
│   ├── Dockerfile
│   └── .dockerignore
├── database/
│   ├── init.sql
│   └── entrypoint.sh
└── docker-compose.yml
```

## 🔄 Updates and Maintenance

### Update a service:
1. Make code changes
2. Rebuild and restart:
   ```bash
   docker-compose up -d --build [service-name]
   ```

### Backup database:
```bash
docker-compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P YourStrong!Password123 -C \
  -Q "BACKUP DATABASE gmao TO DISK='/var/opt/mssql/backup/gmao.bak'"
```

### View container details:
```bash
docker-compose exec backend bash
docker-compose exec sqlserver bash
```

## ✅ Verification Checklist

- [ ] Docker Desktop is running
- [ ] All ports (1433, 4200, 5000, 5002) are available
- [ ] `docker-compose up -d` completes successfully
- [ ] All 4 containers show "Up" status
- [ ] Frontend loads at http://localhost:4200
- [ ] Backend responds at http://localhost:5000/api
- [ ] Database connection works (check backend logs)

## 📞 Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify all containers are running: `docker-compose ps`
3. Ensure Docker has sufficient resources
4. Check firewall/antivirus settings

---

**Ready to deploy!** 🚀
