# Quick Reference Guide - GMAO Planning & UI

## 🚀 Quick Start

### Running the Application
```powershell
# Terminal 1 - Backend API
cd API
dotnet run

# Terminal 2 - Angular Client  
cd client
npm start

# Terminal 3 - Python Chat (Optional)
cd gmaochat
.\start_service.bat
```

Access: http://localhost:4200

---

## 📋 Key Changes at a Glance

### Planning Module
| Feature | Before | Now |
|---------|--------|-----|
| Design | White background | Purple gradient with modern cards |
| Interaction | Route to detail page | Modal popup with full details |
| Assignment | Manual | Click assign button in modal |
| Status Update | N/A | Technician can start/complete |
| Responsiveness | Basic | Fully responsive mobile/tablet/desktop |

### Forms (All Modules)
| Feature | Status |
|---------|--------|
| Modern gradient design | ✅ |
| File drag & drop | ✅ |
| Validation with icons | ✅ |
| Loading overlays | ✅ |
| Success notifications | ✅ |
| Responsive grid | ✅ |

### Tables (All Modules)
| Feature | Status |
|---------|--------|
| Gradient headers | ✅ |
| Colored badges | ✅ |
| Hover scale effects | ✅ |
| Search functionality | ✅ |
| Modern pagination | ✅ |
| Responsive design | ✅ |

---

## 🎯 User Workflows

### Superviseur: Assign Intervention to Technician
1. Go to **Planning** (sidebar menu)
2. Click any **Nouveau** (blue) intervention
3. Modal opens → scroll to "Assignation du technicien"
4. Select technician from dropdown
5. Click **"ASSIGNER"** button
6. Status changes to **En cours** (orange)
7. Technician receives notification

### Technician: Complete Intervention
1. Go to **Planning**
2. Click your assigned intervention (orange)
3. Click **"COMMENCER L'INTERVENTION"** (if nouveau)
4. Work on the intervention
5. Click **"TERMINER L'INTERVENTION"**
6. Status changes to **Terminé** (green)

### Any User: Create New Record
1. Navigate to module (Interventions, Equipment, etc.)
2. Click **"NOUVEAU [TYPE]"** button (purple gradient)
3. Fill all required fields (marked with *)
4. Upload file if needed (drag & drop works!)
5. Click **"CRÉER"**
6. See success notification
7. Automatically redirected to list

---

## 🎨 CSS Classes Reference

### Form Styling
```html
<div class="modern-form-container">
  <div class="form-card">
    <div class="form-header">
      <h1 class="form-title">Title</h1>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Label <span class="required">*</span></label>
        <input type="text" class="form-control">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary">Save</button>
      <button class="btn btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```

### Table Styling
```html
<div class="table-container">
  <div class="table-card">
    <div class="table-header">
      <h1 class="table-title">Title</h1>
      <div class="table-actions">
        <div class="search-box">
          <input class="search-input" placeholder="Search...">
        </div>
        <a class="btn-new" routerLink="/new">NEW</a>
      </div>
    </div>
    <table class="modern-table">
      <thead>...</thead>
      <tbody>...</tbody>
    </table>
  </div>
</div>
```

---

## 🔧 API Endpoints

### New Endpoints Added

#### Assign Technician
```http
POST /api/demandeintervention/{id}/assign
Content-Type: application/json

{
  "technicianId": "user-guid"
}
```

#### Update Status
```http
PATCH /api/demandeintervention/{id}/status
Content-Type: application/json

{
  "status": "en-cours" | "termine" | "annule"
}
```

#### Get Technicians
```http
GET /api/users/technicians

Response: [
  {
    "id": "guid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "roles": ["Technicien"]
  }
]
```

---

## 📱 Responsive Breakpoints

| Device | Width | Changes |
|--------|-------|---------|
| Mobile | <480px | Single column, full-width buttons |
| Tablet | 481-768px | 2-column forms, compact tables |
| Laptop | 769-1024px | 3-column forms, full tables |
| Desktop | >1024px | 4-column forms, wide tables |

---

## 🎨 Color Palette

### Status Colors
- **Nouveau**: `#3b82f6` (Blue)
- **En cours**: `#f59e0b` (Orange)
- **Terminé**: `#10b981` (Green)
- **Annulé**: `#6b7280` (Gray)
- **Urgent**: `#ef4444` (Red) + pulse animation

### Gradient
- **Primary**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

### Badges
- **Success**: Green gradient
- **Warning**: Orange gradient
- **Danger**: Red gradient
- **Info**: Blue gradient
- **Primary**: Purple gradient

---

## 🐛 Troubleshooting

### Planning not loading interventions
```powershell
# Check API is running
curl http://localhost:5000/api/demandeintervention

# Check browser console
F12 → Console tab

# Verify authentication
Check if token is valid in localStorage
```

### Styles not applying
```powershell
# Clear Angular cache
cd client
rm -rf .angular

# Reinstall and restart
npm install
npm start
```

### Assignment not working
```powershell
# Check user role
# Only Superviseur/Admin can assign

# Check technician exists
GET /api/users/technicians

# Check backend logs
cd API
# Check console output
```

---

## ✅ Testing Checklist

### Before Deployment
- [ ] API running on port 5000
- [ ] Client running on port 4200
- [ ] All users have correct roles in database
- [ ] Test login with each role type
- [ ] Create test intervention
- [ ] Assign to test technician
- [ ] Technician can start intervention
- [ ] Technician can complete intervention
- [ ] Calendar updates reflect changes
- [ ] All forms save correctly
- [ ] All tables load data
- [ ] Search works in tables
- [ ] Pagination functions
- [ ] Mobile view responsive
- [ ] File upload works

---

## 📊 File Structure

```
client/src/app/
├── features/
│   ├── planning/
│   │   ├── planning.component.ts (redesigned)
│   │   └── intervention-detail-modal/
│   │       └── intervention-detail-modal.component.ts (NEW)
│   ├── interventions/
│   │   ├── interventions.component.ts (uses modern-table.scss)
│   │   ├── intervention-form/ (uses modern-form.scss)
│   │   └── services/intervention.service.ts (new methods)
│   ├── equipment/
│   │   ├── equipment.component.ts (uses modern-table.scss)
│   │   └── equipment-form/ (uses modern-form.scss)
│   ├── stock/
│   │   ├── stock-list.component.ts (uses modern-table.scss)
│   │   └── stock-form/ (uses modern-form.scss)
│   └── resources/
│       ├── resources-list.component.ts (uses modern-table.scss)
│       └── resource-form/ (uses modern-form.scss)
├── shared/
│   └── styles/
│       ├── modern-form.scss (NEW)
│       └── modern-table.scss (NEW)
└── core/
    └── models/
        ├── intervention.model.ts (updated)
        └── user.model.ts (updated)
```

```
API/Controllers/
├── interventions/
│   └── DemandeInterventionController.cs (new endpoints)
└── UsersController.cs (new technicians endpoint)
```

---

## 🎓 Training Tips

### For New Users
1. Start with Planning module - most visual
2. Click on interventions to explore modal
3. Try creating a test intervention
4. Practice assigning if Superviseur
5. Test status changes if Technicien

### For Admins
1. Review role assignments in database
2. Ensure technician users exist
3. Test full workflow end-to-end
4. Customize colors if needed (styles.scss)
5. Monitor backend logs for errors

---

## 📞 Quick Support

| Issue | Solution |
|-------|----------|
| Styles broken | Clear cache, restart dev server |
| API errors | Check backend is running |
| Auth issues | Clear localStorage, re-login |
| Calendar empty | Check user role filter |
| Can't assign | Must be Superviseur/Admin |
| No technicians | Add users with Technicien role |

---

**Version**: 2.0.0  
**Last Updated**: November 30, 2025  
**Status**: ✅ Production Ready
