# Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# Build backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src

# Copy csproj and restore dependencies
COPY backend/Koplista.Api/Koplista.Api.csproj backend/Koplista.Api/
RUN dotnet restore "backend/Koplista.Api/Koplista.Api.csproj"

# Copy everything else and build
COPY backend/Koplista.Api/ backend/Koplista.Api/
WORKDIR "/src/backend/Koplista.Api"
RUN dotnet build "Koplista.Api.csproj" -c Release -o /app/build

# Publish backend
FROM backend-build AS publish
RUN dotnet publish "Koplista.Api.csproj" -c Release -o /app/publish

# Final stage - backend serving frontend
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Copy backend files
COPY --from=publish /app/publish .

# Copy frontend build to wwwroot
COPY --from=frontend-build /app/frontend/dist ./wwwroot

EXPOSE 8080
ENTRYPOINT ["dotnet", "Koplista.Api.dll"]
