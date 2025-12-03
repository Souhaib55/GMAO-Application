# GMAO Application - Frontend Client

## 🚀 Quick Start

```powershell
npm install
npm start
# Application runs on http://localhost:4200
```

## 📋 Prerequisites

- Node.js 18+
- Angular CLI 17+
- Backend API running on http://localhost:5000
- Python Chat Service (optional) on http://localhost:5002

## 🎨 Features

### ✅ Implemented Modules

- **Login** - Cookie-based authentication
- **Dashboard** - Statistics and quick actions
- **GMAO Chat** - AI assistant for data queries
- **Interventions** - Paginated list with role-based filtering
- **Equipment** - Paginated list with search
- **Resources** - Parts management
- **Stock/Achat** - Inventory (Superviseur only)
- **Settings** - System configuration (Superviseur only)

### 🎯 Modern UI Design

- **Theme**: Light blue (#3B82F6) + white (SaaS style)
- **Responsive**: Mobile, tablet, desktop optimized
- **Sidebar**: Collapsible navigation with icons
- **Mobile Menu**: Hamburger menu with overlay
- **Components**: Cards, tables, buttons, badges, forms

## 🔐 User Roles

- **Superviseur**: Full access
- **Demandeur**: Create and view own interventions
- **Utilisateur**: View assigned interventions

## 🌐 Backend Connection

**API**: http://localhost:5000/api
**Auth**: Cookie-based with `withCredentials: true`

## 🏗️ Project Structure

```
src/app/
├── core/                    # Guards, interceptors, models, services
├── features/                # Feature modules (auth, dashboard, etc.)
├── shared/                  # Shared components (layout)
└── environments/            # Environment configs
```

## 📚 Documentation

See `CLIENT-INTEGRATION-GUIDE.md` at project root for:
- Complete API documentation
- Data models
- Implementation examples
- Deployment guide

## 🔧 Development Commands

```powershell
npm start                # Dev server
npm run build           # Production build
npm test                # Run tests
```

## 📄 License

© 2024 GMAO Application. All rights reserved.
