# K-Plista

A modern, mobile-first grocery list application built with a React frontend and .NET backend.

## Features

- 📱 **Mobile-First Design** - Optimized for mobile devices using Material UI
- 🛒 **Grocery List Management** - Create, edit, and delete grocery lists
- 📦 **Item Grouping** - Organize items into customizable groups
- 👥 **List Sharing** - Share lists with other users with view/edit permissions
- ✅ **Mark as Bought** - Track purchased items in real-time
- 🔐 **OIDC Authentication** - Sign in with Google, Facebook, or Apple

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Material UI** for mobile-first components
- **React Router** for navigation

### Backend
- **ASP.NET Core 9.0** with C#
- **Entity Framework Core** with PostgreSQL
- **JWT Authentication** with OIDC support
- **RESTful API** design

### Infrastructure
- **Docker** and **Docker Compose** for containerization
- **PostgreSQL 16** for database
- **Nginx** for frontend serving and API proxying
- **GitHub Actions** for CI/CD

## Getting Started

### Prerequisites

- Docker and Docker Compose
- .NET 9.0 SDK (for local development)
- Node.js 20+ (for local development)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone https://github.com/twids/k-plista.git
cd k-plista
```

2. Start all services with Docker Compose:
```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:5000

### Local Development

#### Backend

```bash
cd backend/KPlista.Api
dotnet restore
dotnet ef database update
dotnet run
```

The API will be available at `http://localhost:5000`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### Database

For local development, ensure PostgreSQL is running:
```bash
docker run -d --name kplista-postgres \
  -e POSTGRES_DB=kplista \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

## Configuration

### Backend Configuration

Update `backend/KPlista.Api/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=kplista;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Secret": "your-secret-key-here",
    "Issuer": "kplista-api",
    "Audience": "kplista-app"
  },
  "Authentication": {
    "Google": {
      "ClientId": "your-google-client-id",
      "ClientSecret": "your-google-client-secret"
    },
    "Facebook": {
      "AppId": "your-facebook-app-id",
      "AppSecret": "your-facebook-app-secret"
    }
  }
}
```

### Frontend Configuration

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## API Documentation

### Authentication
- `POST /api/auth/login` - Login with OIDC provider
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/facebook` - Initiate Facebook OAuth

### Grocery Lists
- `GET /api/grocerylists` - Get all lists
- `POST /api/grocerylists` - Create a new list
- `GET /api/grocerylists/{id}` - Get list details
- `PUT /api/grocerylists/{id}` - Update a list
- `DELETE /api/grocerylists/{id}` - Delete a list

### Grocery Items
- `GET /api/grocerylists/{listId}/items` - Get all items in a list
- `POST /api/grocerylists/{listId}/items` - Add item to list
- `PUT /api/grocerylists/{listId}/items/{id}` - Update item
- `PATCH /api/grocerylists/{listId}/items/{id}/bought` - Mark item as bought
- `DELETE /api/grocerylists/{listId}/items/{id}` - Delete item

### Item Groups
- `GET /api/grocerylists/{listId}/groups` - Get all groups
- `POST /api/grocerylists/{listId}/groups` - Create group
- `PUT /api/grocerylists/{listId}/groups/{id}` - Update group
- `DELETE /api/grocerylists/{listId}/groups/{id}` - Delete group

### List Sharing
- `GET /api/grocerylists/{listId}/shares` - Get list shares
- `POST /api/grocerylists/{listId}/shares` - Share list with user
- `PUT /api/grocerylists/{listId}/shares/{id}` - Update share permissions
- `DELETE /api/grocerylists/{listId}/shares/{id}` - Remove share

## CI/CD

The project includes GitHub Actions workflows for:

### PR Build (`pr-build.yml`)
- Runs on every pull request
- Builds backend and frontend
- Runs tests and linting
- Builds Docker images
- **Runs comprehensive E2E tests** with Playwright
- Blocks merge if any tests fail

### Full CI/CD (`ci-cd.yml`)
- Runs on push to main branch
- Builds and tests all components
- Pushes Docker images to GitHub Container Registry
- Runs security scanning with Trivy

## Testing

### End-to-End Tests

The project includes comprehensive E2E tests using Playwright that cover:

- Authentication flows
- Grocery list management (CRUD operations)
- Grocery item management
- Item grouping and organization
- List sharing and collaboration
- Complete user workflows

**Running E2E Tests Locally:**

```bash
# Start the application
docker-compose up -d

# Install test dependencies
cd e2e
npm install

# Run tests
npm test

# Run tests with UI
npm run test:ui

# View test report
npm run test:report
```

For detailed testing documentation, see [e2e/README.md](e2e/README.md).

## Project Structure

```
k-plista/
├── backend/
│   ├── KPlista.Api/
│   │   ├── Controllers/      # API controllers
│   │   ├── Data/             # Database context
│   │   ├── DTOs/             # Data transfer objects
│   │   ├── Models/           # Domain models
│   │   ├── Services/         # Business services (JWT, etc.)
│   │   └── Program.cs        # Application entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── contexts/         # React contexts (Auth)
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── types/            # TypeScript types
│   │   └── App.tsx           # Main app component
│   ├── Dockerfile
│   └── nginx.conf
├── e2e/
│   ├── tests/                # E2E test suites
│   │   ├── helpers/          # Test utilities
│   │   └── pages/            # Page Object Models
│   ├── playwright.config.ts  # Playwright configuration
│   └── README.md             # Testing documentation
├── .github/
│   └── workflows/            # GitHub Actions workflows
└── docker-compose.yml        # Docker Compose configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. **Ensure all tests pass** (`cd e2e && npm test`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

**Note:** All PRs must pass E2E tests before merging. Tests run automatically in CI/CD.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with React and Material UI
- Powered by ASP.NET Core and Entity Framework
- Containerized with Docker
- Tested with Playwright

