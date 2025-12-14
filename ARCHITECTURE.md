# Koplista Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Devices                              │
│  (Mobile Browsers, Desktop Browsers, Tablets)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                ASP.NET Core Backend (Port 80)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Static Files (React SPA) served from wwwroot            │  │
│  │  • index.html, JS bundles, CSS, assets                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Endpoints (/api/*)                                   │  │
│  │  • RESTful API with JWT authentication                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │
                ┌────────▼────────┐
                │   PostgreSQL    │
                │     Port 5432   │
                └──────────────────┘
```

## Component Breakdown

### Frontend Layer
```
┌─────────────────────────────────────────┐
│         React Application               │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │  Pages                            │ │
│  │  • LoginPage                      │ │
│  │  • ListsPage                      │ │
│  │  • ListDetailPage                 │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │  Components                       │ │
│  │  • CreateListDialog               │ │
│  │  • AddItemDialog                  │ │
│  │  • CreateGroupDialog              │ │
│  │  • ShareListDialog                │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │  Services (API Clients)           │ │
│  │  • authService                    │ │
│  │  • groceryListService             │ │
│  │  • groceryItemService             │ │
│  │  • itemGroupService               │ │
│  │  • listShareService               │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │  Context                          │ │
│  │  • AuthContext (User State)       │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Backend Layer
```
┌─────────────────────────────────────────┐
│      ASP.NET Core Web API               │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │  Controllers (Endpoints)          │ │
│  │  • AuthController                 │ │
│  │  • GroceryListsController         │ │
│  │  • GroceryItemsController         │ │
│  │  • ItemGroupsController           │ │
│  │  • ListSharesController           │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │  Data Layer                       │ │
│  │  • KPlistaDbContext (EF Core)     │ │
│  │  • Migrations                     │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │  Models (Domain)                  │ │
│  │  • User                           │ │
│  │  • GroceryList                    │ │
│  │  • GroceryItem                    │ │
│  │  • ItemGroup                      │ │
│  │  • ListShare                      │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │  DTOs (Data Transfer)             │ │
│  │  • Create/Update DTOs             │ │
│  │  • Response DTOs                  │ │
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │  Authentication                   │ │
│  │  • JWT Bearer                     │ │
│  │  • Google OAuth                   │ │
│  │  • Facebook OAuth                 │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Database Schema
```
┌─────────────────────────────────────────┐
│          PostgreSQL Database            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐       ┌──────────────┐  │
│  │  Users   │◄──────┤ GroceryLists │  │
│  └────┬─────┘       └──────┬───────┘  │
│       │                    │           │
│       │                    │           │
│  ┌────▼─────────┐    ┌────▼──────┐   │
│  │  ListShares  │    │ ItemGroups│   │
│  └──────────────┘    └────┬──────┘   │
│                           │           │
│                      ┌────▼────────┐  │
│                      │GroceryItems │  │
│                      └─────────────┘  │
└─────────────────────────────────────────┘
```

## Data Flow

### Creating a Grocery List
```
User Action → Frontend Component → API Service → HTTP Request
                                                      ↓
Backend Controller ← JSON Response ← Database ← EF Core
      ↓
Update UI (Re-fetch lists)
```

### Marking Item as Bought
```
Click Checkbox → GroceryItemService.markBought()
                        ↓
                PATCH /api/grocerylists/{id}/items/{id}/bought
                        ↓
                GroceryItemsController
                        ↓
                Update Database
                        ↓
                Return 204 No Content
                        ↓
                Refresh List Items
                        ↓
                Update UI (strikethrough + opacity)
```

### Sharing a List
```
Enter Email + Click Share → ShareListDialog
                                   ↓
                    POST /api/grocerylists/{id}/shares
                                   ↓
                    ListSharesController
                                   ↓
                    Validate User Exists
                                   ↓
                    Create ListShare Record
                                   ↓
                    Return ShareDto
                                   ↓
                    Update Share List UI
```

## Authentication Flow

### Login Process
```
┌──────────────┐
│  User clicks │
│  OAuth button│
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────┐
│  Redirect to OAuth Provider     │
│  (Google/Facebook)               │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  User Authenticates             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Callback with token            │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Backend: Create/Update User    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Generate JWT Token             │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Store token in localStorage    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Include in Authorization header│
│  for all API requests           │
└──────────────────────────────────┘
```

## API Request Flow

### Authenticated Request
```
Frontend                    Backend                  Database
   │                          │                         │
   │  GET /api/grocerylists   │                         │
   │  Authorization: Bearer   │                         │
   │  {token}                 │                         │
   ├─────────────────────────►│                         │
   │                          │                         │
   │                          │  Validate JWT           │
   │                          │  Extract User ID        │
   │                          │                         │
   │                          │  Query Lists            │
   │                          ├────────────────────────►│
   │                          │                         │
   │                          │  Return Results         │
   │                          │◄────────────────────────┤
   │                          │                         │
   │  JSON Response           │                         │
   │◄─────────────────────────┤                         │
   │                          │                         │
```

## Docker Infrastructure

### Container Architecture
```
┌─────────────────────────────────────────────────────┐
│              Docker Compose Network                  │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │        Application Container               │    │
│  │    (ASP.NET Core + React Frontend)         │    │
│  │                                             │    │
│  │  ┌─────────────────────────────────────┐  │    │
│  │  │   wwwroot/ (React Build Output)     │  │    │
│  │  │   • index.html                       │  │    │
│  │  │   • JS/CSS bundles                   │  │    │
│  │  └─────────────────────────────────────┘  │    │
│  │                                             │    │
│  │  ┌─────────────────────────────────────┐  │    │
│  │  │   ASP.NET Core API                   │  │    │
│  │  │   • REST endpoints (/api/*)          │  │    │
│  │  │   • JWT authentication               │  │    │
│  │  │   • Static file middleware           │  │    │
│  │  └─────────────────────────────────────┘  │    │
│  │                                             │    │
│  │              Port: 8080                     │    │
│  └────────────────┬───────────────────────────┘    │
│                   │                                 │
│           ┌───────▼────────┐                       │
│           │   PostgreSQL    │                       │
│           │   Container     │                       │
│           │   Port: 5432    │                       │
│           └─────────────────┘                       │
│                   │                                 │
│           ┌───────▼────────┐                       │
│           │  Volume:        │                       │
│           │  postgres_data  │                       │
│           └─────────────────┘                       │
└─────────────────────────────────────────────────────┘
```

## CI/CD Pipeline

### Pull Request Flow
```
┌──────────────┐
│  Developer   │
│  Creates PR  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────┐
│  GitHub Actions Triggered       │
│  (pr-build.yml)                 │
└──────┬──────────────────────────┘
       │
       ├──► Build Backend (dotnet)
       │
       ├──► Build Frontend (npm)
       │
       ├──► Lint Frontend
       │
       └──► Build Docker Images
              │
              ▼
         ┌─────────────┐
         │  All Pass?  │
         └─────┬───────┘
               │
         ┌─────┴─────┐
         │           │
        YES         NO
         │           │
         ▼           ▼
   ✅ Merge      ❌ Fix Issues
   Allowed
```

### Main Branch Flow
```
┌──────────────┐
│  Merge to    │
│  main branch │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────┐
│  GitHub Actions Triggered       │
│  (ci-cd.yml)                    │
└──────┬──────────────────────────┘
       │
       ├──► Build & Test All
       │
       ├──► Security Scan (Trivy)
       │
       └──► Build & Push Docker Images
              │
              ▼
         ┌─────────────────────────┐
         │  GitHub Container       │
         │  Registry (ghcr.io)     │
         └─────────────────────────┘
```

## Security Model

### Authentication & Authorization
```
┌────────────────────────────────────────┐
│         Request Processing             │
├────────────────────────────────────────┤
│  1. User makes request with JWT        │
│     ↓                                  │
│  2. Middleware validates token         │
│     ↓                                  │
│  3. Extract user claims                │
│     ↓                                  │
│  4. Controller checks authorization    │
│     • Is user owner?                   │
│     • Does user have share access?     │
│     • Does user have edit permission?  │
│     ↓                                  │
│  5. Execute if authorized              │
│     ↓                                  │
│  6. Return data/error                  │
└────────────────────────────────────────┘
```

### Data Access Control
```
User A wants to access List X:
  ├─► Is User A the owner? → YES → Full Access
  ├─► Is List X shared with User A?
  │   ├─► YES, with edit → Can modify
  │   └─► YES, view only → Read only
  └─► NO → 403 Forbidden
```

## Performance Considerations

### Frontend Optimization
- Code splitting with Vite
- Material UI tree-shaking
- Lazy loading of routes
- Memoization of expensive renders
- Efficient state updates

### Backend Optimization
- Database indexing on foreign keys
- EF Core compiled queries
- Async/await throughout
- Connection pooling
- Response caching headers

### Infrastructure Optimization
- Multi-stage Docker builds
- Nginx static file caching
- Gzip compression
- Build artifact caching (GitHub Actions)

## Monitoring Points

### Application Health
- Backend health check endpoint
- Database connection status
- Frontend build status
- Docker container status

### Key Metrics to Track
- Response time per endpoint
- Database query performance
- Error rates
- User session duration
- List/Item creation rates
- Share invitation acceptance rates

## Scalability Path

### Horizontal Scaling
```
Current:
  1 Frontend + 1 Backend + 1 Database

Scale to:
  N Frontend (Load Balanced)
  N Backend (Load Balanced)
  1 Database (Primary) + M Read Replicas
```

### Future Enhancements
- Redis for session management
- Message queue for async operations
- CDN for static assets
- Database sharding for multi-tenancy
- Microservices architecture for specific domains
