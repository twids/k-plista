# Google OAuth Configuration Guide

## 1. Skapa Google OAuth Credentials

1. **Gå till Google Cloud Console**
   - Besök: https://console.cloud.google.com/

2. **Skapa eller välj ett projekt**
   - Klicka på projekt-dropdown högst upp
   - Skapa nytt projekt eller välj befintligt

3. **Aktivera Google+ API eller Google Identity Services**
   - Gå till "APIs & Services" > "Library"
   - Sök efter "Google+ API" eller "Identity and Access Management (IAM) API"
   - Klicka "Enable"

4. **Skapa OAuth 2.0 Credentials**
   - Gå till "APIs & Services" > "Credentials"
   - Klicka "Create Credentials" > "OAuth client ID"
   - Välj "Web application"
   - Ge det ett namn (t.ex. "Koplista Web")

5. **Konfigurera Authorized redirect URIs**
   Eftersom vi nu explicit sätter `CallbackPath = "/api/auth/google-callback"` i `Program.cs`, ska du lägga till exakt den routen (med rätt schema och port) i Google Console.

   Lokal utveckling (HTTPS och HTTP profil):
   ```
   https://localhost:7097/api/auth/google-callback
   http://localhost:5157/api/auth/google-callback
   ```
   Docker (public port 80):
   ```
   http://localhost/api/auth/google-callback
   ```
   Produktion:
   ```
   https://yourdomain.com/api/auth/google-callback
   ```

6. **Kopiera dina credentials**
   - Client ID: ser ut som `xxxxx.apps.googleusercontent.com`
   - Client Secret: hemlig sträng

## 2. Konfigurera Backend

Uppdatera `backend/KPlista.Api/appsettings.json`:

```json
{
  "Authentication": {
    "Google": {
      "ClientId": "din-google-client-id.apps.googleusercontent.com",
      "ClientSecret": "din-google-client-secret"
    }
  }
}
```

För produktion, använd miljövariabler istället:
- `Authentication__Google__ClientId`
- `Authentication__Google__ClientSecret`

## 3. Uppdatera Docker Environment

I `docker-compose.yml` eller `.env`:

```yaml
environment:
  Authentication__Google__ClientId: "din-google-client-id.apps.googleusercontent.com"
  Authentication__Google__ClientSecret: "din-google-client-secret"
```

## 4. Facebook OAuth (valfritt)

Samma process för Facebook:
1. Gå till https://developers.facebook.com/
2. Skapa en app
3. Konfigurera Facebook Login
4. Lägg till samtliga relevanta redirect URIs (motsvarande Google):
   ```
   https://localhost:7097/api/auth/facebook-callback
   http://localhost:5157/api/auth/facebook-callback
   http://localhost/api/auth/facebook-callback
   https://yourdomain.com/api/auth/facebook-callback
   ```
5. Uppdatera `appsettings.json` med App ID och App Secret

## 5. Testa

1. Starta applikationen: `docker compose up --build`
2. Gå till http://localhost
3. Klicka "Sign in with Google"
4. Du bör redirectas till Google för autentisering
5. Efter godkännande redirectas du tillbaka med en fungerande session

## Felsökning

**"Error 400: redirect_uri_mismatch"**
- Kontrollera att redirect URI i konsolen matchar exakt den `CallbackPath` din applikation exponerar (schema, port, domän)
- Undvik extra `/` på slutet
- Om du nyligen ändrat `CallbackPath`, lägg till den nya varianten och ta bort gamla `/signin-google` eller `/signin-facebook` om de inte längre används

**"invalid_client"**
- Kontrollera Client ID och Client Secret
- Se till att Google+ API är aktiverad

**"scope"**
- Kontrollera att rätt scopes är konfigurerade i backend