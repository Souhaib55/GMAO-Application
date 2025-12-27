# 🔧 GMAO - Gestion de Maintenance Assistée par Ordinateur

## 📖 Project Overview

Full-stack GMAO (Computerized Maintenance Management System) application with:
- **Backend**: .NET 9.0 Web API
- **Frontend**: Angular 16
- **Database**: SQL Server 2022
- **AI Chatbot**: Python FastAPI service

## 🐳 Docker Deployment

### Prerequisites
- Docker Desktop installed
- 4GB+ RAM available
- Ports 1433, 4200, 5000, 5002 free

### Quick Start
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access**: http://localhost:4200

**See [DOCKER-GUIDE.md](DOCKER-GUIDE.md) for complete documentation**

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          Docker Network (gmao-network)      │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Frontend │  │ Backend  │  │ Chatbot  │ │
│  │ Angular  │─→│  .NET 9  │─→│  Python  │ │
│  │  :4200   │  │  :5000   │  │  :5002   │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                      │                      │
│                      ↓                      │
│               ┌──────────┐                 │
│               │SQL Server│                 │
│               │  :1433   │                 │
│               └──────────┘                 │
└─────────────────────────────────────────────┘
```

## 📦 Services

| Service | Technology | Port | Container Name |
|---------|-----------|------|----------------|
| Frontend | Angular 16 + Nginx | 4200 | gmao-frontend |
| Backend | .NET 9.0 Web API | 5000 | gmao-backend |
| Chatbot | Python 3.11 FastAPI | 5002 | gmao-chatbot |
| Database | SQL Server 2022 | 1433 | gmao-sqlserver |

## 🚀 Development

### Local Development (without Docker)

#### Backend
```bash
cd API
dotnet restore
dotnet run
```

#### Frontend
```bash
cd client
npm install
ng serve
```

#### Database
Update `appsettings.Development.json` with your local SQL Server connection.

## 📂 Project Structure

```
GMAO/
├── API/                    # .NET Backend
│   ├── Controllers/
│   ├── DTOs/
│   ├── Extensions/
│   ├── Dockerfile
│   └── Program.cs
├── Core/                   # Domain Entities
│   └── Entities/
├── Infrastructure/         # Data Access
│   ├── Data/
│   └── Migrations/
├── client/                 # Angular Frontend
│   ├── src/app/
│   ├── Dockerfile
│   └── nginx.conf
├── gmaochat/              # Python Chatbot
│   ├── gmao_chatbot_service.py
│   ├── Dockerfile
│   └── requirements.txt
├── database/              # Database Scripts
│   └── init.sql
├── docker-compose.yml     # Docker Orchestration
└── DOCKER-GUIDE.md       # Deployment Guide
```

## 🔐 Security

### Production Checklist
- [ ] Change default SA password in `docker-compose.yml`
- [ ] Remove API keys from `appsettings.Production.json`
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up firewall rules
- [ ] Use Docker secrets for sensitive data
- [ ] Enable authentication/authorization
- [ ] Configure backup strategy

## 📊 Database

Database is automatically created on first startup. Entity Framework migrations handle schema updates.

### Manual Migration
```bash
docker-compose exec backend dotnet ef database update
```

### Backup
```bash
docker-compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P YourStrong!Password123 -C \
  -Q "BACKUP DATABASE gmao TO DISK='/var/opt/mssql/backup/gmao.bak'"
```

## 🔧 Troubleshooting

### Check Service Health
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Restart Service
```bash
docker-compose restart backend
```

### Complete Reset
```bash
docker-compose down -v
docker-compose up -d
```

## 🌐 Server Deployment

### Via VPN + RDC
1. Connect via FortiClient VPN
2. Access server via Remote Desktop
3. Copy project folder to server
4. Run: `docker-compose up -d`
5. Access via: `http://SERVER_IP:4200`

## 📝 API Documentation

API endpoints are available at: `http://localhost:5000/api`

Main controllers:
- `/api/account` - Authentication
- `/api/equipment` - Equipment management
- `/api/stock` - Stock management
- `/api/demandeintervention` - Intervention requests
- `/api/gmaochat` - AI Chatbot

## 🧪 Testing

### Backend Tests
```bash
cd API
dotnet test
```

### Frontend Tests
```bash
cd client
ng test
```

## 📞 Support

For issues or questions:
1. Check [DOCKER-GUIDE.md](DOCKER-GUIDE.md)
2. Review logs: `docker-compose logs -f`
3. Verify services: `docker-compose ps`

## 📄 License

[Your License Here]

## 👥 Contributors

- Souhaib - Developer

---

**Built with ❤️ for GMAO Project 2024-2025**
