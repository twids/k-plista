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
- **ASP.NET Core** serving frontend static files
- **GitHub Actions** for CI/CD with automated Docker image publishing

## Getting Started

### Prerequisites

- Docker and Docker Compose
- .NET 9.0 SDK (for local development)
- Node.js 20+ (for local development)

### Quick Start with Docker

#### Using Pre-built Docker Image from GitHub Container Registry

The easiest way to run K-Plista is using the published Docker image:

1. Create a `docker-compose.yml` file:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: kplista-postgres
    environment:
      POSTGRES_DB: kplista
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ghcr.io/twids/k-plista:latest
    container_name: kplista-app
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_URLS: http://+:8080
      ConnectionStrings__DefaultConnection: "Host=postgres;Database=kplista;Username=postgres;Password=postgres"
      Jwt__Secret: "your-secret-key-min-32-characters-long-for-security-please-change-in-production"
      Jwt__Issuer: "kplista-api"
      Jwt__Audience: "kplista-app"
    ports:
      - "80:8080"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the application at http://localhost

#### Building from Source

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
   - Application: http://localhost
   - API endpoint: http://localhost/api

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

Create `frontend/.env` for local development:

```env
VITE_API_URL=http://localhost:5000/api
```

**Note:** When running in Docker, the frontend is served by the backend and uses relative API paths, so no separate configuration is needed.

## Docker Deployment

### Published Docker Images

The application is automatically built and published to GitHub Container Registry on every push to the main branch.

- **Image:** `ghcr.io/twids/k-plista:latest`
- **Architecture:** Multi-stage build combining frontend and backend into a single container
- **Registry:** GitHub Container Registry (ghcr.io)

### Pulling the Image

```bash
docker pull ghcr.io/twids/k-plista:latest
```

### Running the Container

```bash
docker run -p 80:8080 \
  -e ConnectionStrings__DefaultConnection="Host=postgres;Database=kplista;Username=postgres;Password=postgres" \
  -e Jwt__Secret="your-secret-key-min-32-characters-long" \
  -e Jwt__Issuer="kplista-api" \
  -e Jwt__Audience="kplista-app" \
  ghcr.io/twids/k-plista:latest
```

### Docker Compose Example

See the [Quick Start with Docker](#quick-start-with-docker) section above for a complete `docker-compose.yml` example.

### Building Custom Images

To build your own Docker image:

```bash
# From repository root
docker build -t kplista:custom .
```

The Dockerfile uses a multi-stage build:
1. **Stage 1:** Builds the React frontend with Node.js
2. **Stage 2:** Builds the .NET backend
3. **Stage 3:** Combines frontend static files (in `wwwroot`) with the backend runtime

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

### Full CI/CD (`ci-cd.yml`)
- Runs on push to main branch
- Builds and tests all components
- Builds unified Docker image (frontend + backend)
- Pushes Docker image to GitHub Container Registry (`ghcr.io/twids/k-plista:latest`)
- Runs security scanning with Trivy
- Tags images with branch name and commit SHA for version tracking

## Project Structure

```
k-plista/
├── backend/
│   ├── KPlista.Api/
│   │   ├── Controllers/      # API controllers
│   │   ├── Data/             # Database context
│   │   ├── DTOs/             # Data transfer objects
│   │   ├── Models/           # Domain models
│   │   ├── wwwroot/          # Static files (frontend build output in Docker)
│   │   └── Program.cs        # Application entry point + static file serving
│   └── Dockerfile            # Legacy backend-only Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── contexts/         # React contexts (Auth)
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── types/            # TypeScript types
│   │   └── App.tsx           # Main app component
│   ├── Dockerfile            # Legacy frontend-only Dockerfile
│   └── nginx.conf            # Legacy Nginx configuration
├── .github/
│   └── workflows/            # GitHub Actions workflows
├── Dockerfile                # Unified multi-stage Dockerfile (frontend + backend)
└── docker-compose.yml        # Docker Compose configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with React and Material UI
- Powered by ASP.NET Core and Entity Framework
- Containerized with Docker

