# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY Koplista.Api/Koplista.Api.csproj Koplista.Api/
RUN dotnet restore "Koplista.Api/Koplista.Api.csproj"

# Copy everything else and build
COPY Koplista.Api/ Koplista.Api/
WORKDIR "/src/Koplista.Api"
RUN dotnet build "Koplista.Api.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "Koplista.Api.csproj" -c Release -o /app/publish

# Final stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Koplista.Api.dll"]
