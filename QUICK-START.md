# GMAO Application - Quick Start Guide

## 🚀 Starting the Complete Application

### Step 1: Start SQL Server
Ensure your SQL Server is running with the GMAO database.

### Step 2: Start the Backend API

```powershell
cd API
dotnet run
```

The API will run on **http://localhost:5000**

### Step 3: Start the Python Chat Service (Optional)

```powershell
cd gmaochat
.\start_service.bat
```

The chat service will run on **http://localhost:5002**

### Step 4: Start the Angular Frontend

```powershell
cd client
npm install  # First time only
npm start
```

The application will open on **http://localhost:4200**

## 🔑 Login

Use existing credentials from your database or create a new user via API:

```http
POST http://localhost:5000/api/account/register
Content-Type: application/json

{
  "firstName": "Admin",
  "lastName": "User",
  "email": "admin@example.com",
  "password": "Password123!",
  "roleId": 1
}
```

**Role IDs:**
- `1` = Superviseur (full access)
- `2` = Demandeur (create interventions)
- `3` = Utilisateur (view assigned)

## 📱 Features Overview

### Navigation Menu

- **Dashboard**: Statistics and quick actions
- **GMAO Chat**: AI assistant for queries
- **Interventions**: Manage maintenance requests
- **Équipements**: Equipment inventory
- **Ressources**: Parts and resources
- **Stock/Achat**: Inventory management (Superviseur only)
- **Paramètres**: System settings (Superviseur only)

### Responsive Design

- **Desktop**: Full sidebar navigation
- **Tablet**: Collapsible sidebar
- **Mobile**: Hamburger menu with overlay

## 🎨 UI Theme

- **Primary Color**: Light Blue (#3B82F6)
- **Background**: White + Light Gray
- **Style**: Modern SaaS application
- **Typography**: Inter font family

## 🔧 Common Issues

### Port Already in Use

**Frontend (4200):**
```powershell
# Find and kill process
netstat -ano | findstr :4200
taskkill /PID <PID> /F
```

**Backend (5000):**
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### CORS Errors
The backend is pre-configured for http://localhost:4200. If you use a different port, update `Program.cs` in the API project.

### Authentication Issues
- Clear browser cookies
- Check that the backend is running
- Verify credentials

### Chat Not Working
The Python service is optional. The rest of the application works without it.

## 📁 Project Structure

```
GMAO-Application/
├── API/                     # .NET Backend
├── client/                  # Angular Frontend
├── gmaochat/               # Python AI Service
├── Core/                   # Domain Models
├── Infrastructure/         # Data Access
└── CLIENT-INTEGRATION-GUIDE.md
```

## 🧪 Testing

### Test API Health
```
GET http://localhost:5000/api/equipment
# Should return 401 (confirms API is running)
```

### Test Frontend
Navigate to http://localhost:4200/login
# Should see the login page

### Test Chat Service
```
GET http://localhost:5000/api/gmao-chat/test
# Should return status of both services
```

## 📖 Next Steps

1. **Login** to the application
2. **Explore** the dashboard
3. **Try** the GMAO Chat assistant
4. **Create** a new intervention
5. **Manage** equipment and resources

## 🆘 Need Help?

- Check `CLIENT-INTEGRATION-GUIDE.md` for detailed API documentation
- Review component files in `client/src/app/features/`
- Check console for error messages (F12 in browser)

## 🎯 Development Tips

### Hot Reload
- Frontend: Automatic with `ng serve`
- Backend: Use `dotnet watch run` in API folder
- Python: Restart service manually

### Debug Mode
- **Frontend**: F12 in browser → Console/Network tabs
- **Backend**: Use Visual Studio or VS Code with debugger
- **API Calls**: Check Network tab for request/response

## 📝 Important Notes

1. **First Run**: Run `npm install` in client folder
2. **Database**: Ensure migrations are applied
3. **Credentials**: Store API keys securely (appsettings.json)
4. **Browser**: Use Chrome/Edge for best compatibility

---

Happy coding! 🚀
