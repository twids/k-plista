# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY KPlista.Api/KPlista.Api.csproj KPlista.Api/
RUN dotnet restore "KPlista.Api/KPlista.Api.csproj"

# Copy everything else and build
COPY KPlista.Api/ KPlista.Api/
WORKDIR "/src/KPlista.Api"
RUN dotnet build "KPlista.Api.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "KPlista.Api.csproj" -c Release -o /app/publish

# Final stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "KPlista.Api.dll"]
