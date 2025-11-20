# Koplista

A modern, mobile-first grocery list application built with a React frontend and .NET backend.

## Features

- 📱 **Mobile-First Design** - Optimized for mobile devices using Material UI
- 🛒 **Grocery List Management** - Create, edit, and delete grocery lists
- 📦 **Item Grouping** - Organize items into customizable groups
- 👥 **List Sharing** - Share lists with other users with view/edit permissions
- ✅ **Mark as Bought** - Track purchased items in real-time
- 🔐 **OIDC Authentication** - Sign in with Google, Facebook, or Apple
- ⚡ **Real-Time Updates** - See changes instantly with SignalR WebSocket integration
- 👀 **Presence Indicators** - Know who's actively viewing the same list

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Material UI** for mobile-first components
- **React Router** for navigation
- **SignalR Client** for real-time communication

### Backend
- **ASP.NET Core 9.0** with C#
- **Entity Framework Core** with PostgreSQL
- **JWT Authentication** with OIDC support
- **RESTful API** design
- **SignalR** for WebSocket-based real-time updates

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

The easiest way to run Koplista is using the published Docker image:

1. Download the example files:
```bash
# Download docker-compose example (choose one of the following)
wget https://raw.githubusercontent.com/twids/k-plista/main/docker-compose.example.yml -O docker-compose.yml
# OR
curl -o docker-compose.yml https://raw.githubusercontent.com/twids/k-plista/main/docker-compose.example.yml

# Download .env example and configure it (choose one of the following)
wget https://raw.githubusercontent.com/twids/k-plista/main/.env.example -O .env
# OR
curl -o .env https://raw.githubusercontent.com/twids/k-plista/main/.env.example

# If you don't have wget or curl, you can manually download these files from:
# https://github.com/twids/k-plista
# Edit .env and set your JWT_SECRET and other sensitive values
```

2. Configure your environment variables (important for production):
```bash
# Edit .env file and update at minimum:
# - JWT_SECRET: A strong secret key (32+ characters)
# - POSTGRES_PASSWORD: A secure database password
```

3. Start the application:
```bash
docker compose up -d
```

4. Access the application at http://localhost

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

**Note:** When running in Docker or production deployments, the frontend is served by the backend and uses relative paths for both API requests and SignalR connections, so no separate `VITE_API_URL` configuration is needed. The frontend will automatically connect to the same host it's served from.

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

### Real-Time Communication (SignalR)
- **Hub Endpoint**: `/hubs/list`
- **Authentication**: JWT token via query string (`?access_token=...`)
- **Events**:
  - `JoinList(listId)` - Join a list room to receive updates
  - `LeaveList(listId)` - Leave a list room
  - `ItemAdded` - Notifies when an item is added
  - `ItemUpdated` - Notifies when an item is updated
  - `ItemBoughtStatusChanged` - Notifies when item bought status changes
  - `ItemRemoved` - Notifies when an item is deleted
  - `UserJoined` - Notifies when a user joins the list
  - `UserLeft` - Notifies when a user leaves the list
  - `ActiveUsers` - Sends list of currently active users

## Real-Time Features

Koplista uses SignalR for real-time collaboration:

### Instant Updates
- Changes made by any user are immediately visible to all viewers
- No manual refresh needed
- Supports adding, updating, marking as bought, and deleting items

### Presence Indicators
- See who's currently viewing the same list
- User avatars displayed in the app bar
- Real-time join/leave notifications

### Automatic Reconnection
- Handles disconnections gracefully
- Exponential backoff retry strategy
- Automatically rejoins list rooms after reconnection

### Security
- Uses existing JWT authentication
- Only authorized users can access list updates
- Room-based isolation ensures users only see their own lists

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
│   │   ├── Hubs/             # SignalR hubs
│   │   ├── Models/           # Domain models
│   │   ├── wwwroot/          # Static files (frontend build output in Docker)
│   │   └── Program.cs        # Application entry point + static file serving
│   └── Dockerfile            # Legacy backend-only Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── contexts/         # React contexts (Auth, SignalR)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services and SignalR client
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

