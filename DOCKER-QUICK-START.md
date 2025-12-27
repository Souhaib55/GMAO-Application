# 🐳 Docker Deployment - Quick Reference

## Start Everything
```bash
docker-compose up -d
```

## Access Points
- Frontend: http://localhost:4200
- Backend: http://localhost:5000/api
- Chatbot: http://localhost:5002
- Database: localhost:1433 (sa/YourStrong!Password123)

## Check Status
```bash
docker-compose ps
docker-compose logs -f
```

## Stop Everything
```bash
docker-compose down
```

## Reset Database
```bash
docker-compose down -v
docker-compose up -d
```

## Rebuild After Code Changes
```bash
docker-compose up -d --build
```

## Production Deployment (Server)
1. Copy GMAO folder to server via RDC
2. Run: `docker-compose up -d`
3. Access: http://SERVER_IP:4200

⚠️ **Remember to change SA_PASSWORD in production!**
