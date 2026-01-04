# Voice Assistant Setup Guide

## Overview

Koplista now supports adding items to your grocery lists via external APIs, enabling voice assistant integration through services like Home Assistant, Siri Shortcuts, and other automation tools.

This feature allows you to use voice commands like:
- "Hey Google, add milk to my shopping list"
- "Hey Siri, add eggs to my grocery list"
- Automate list additions through Home Assistant automations

Since Google has sunset Conversational Actions, the recommended approach is to use Home Assistant as a bridge between Google Assistant and Koplista's API.

## Generating an API Key

1. **Log in to Koplista** and navigate to your account
2. **Open Settings** by clicking the settings icon (⚙️) in the top navigation bar
3. **Create API Key:**
   - Scroll to the "API Keys" section
   - Click "Create Key"
   - Enter a descriptive name (e.g., "Home Assistant", "Siri Shortcut")
   - Click "Create"
4. **Save your key immediately** - this is the only time you'll see the full key
   - Copy the key to a secure location
   - You'll use this key in your integrations

## Setting a Default List

Before using voice commands, you need to configure which grocery list should receive items:

1. **Navigate to Settings** (⚙️ icon in the top bar)
2. **Select Default List:**
   - In the "Default List for Voice Commands" section
   - Choose your preferred list from the dropdown
   - This list will receive all items added via the external API (unless a specific list is specified)

If you don't set a default list, the API will return an error when you try to add items without specifying a list ID.

## Home Assistant Setup

### Prerequisites

- Home Assistant installed and running
- Access to your Home Assistant configuration files
- Your Koplista API key (generated above)
- Your Koplista instance URL (e.g., `https://your-koplista-domain.com` or `http://localhost` for local setup)

### Step 1: Configure REST Command

Add the following to your Home Assistant `configuration.yaml`:

```yaml
rest_command:
  add_to_koplista:
    url: "https://your-koplista-domain.com/api/external/add-item"
    method: POST
    headers:
      X-API-Key: "your-api-key-here"
      Content-Type: "application/json"
    payload: '{"itemName": "{{ item }}"}'
```

**Replace:**
- `your-koplista-domain.com` with your actual Koplista URL
- `your-api-key-here` with the API key you generated

### Step 2: Configure Intent Script

Add this to your `configuration.yaml` to handle shopping list intents:

```yaml
intent_script:
  AddToShoppingList:
    speech:
      text: "Lade till {{ item }} på köplistan"
    action:
      - service: rest_command.add_to_koplista
        data:
          item: "{{ item }}"
```

**For English:**

```yaml
intent_script:
  AddToShoppingList:
    speech:
      text: "Added {{ item }} to the shopping list"
    action:
      - service: rest_command.add_to_koplista
        data:
          item: "{{ item }}"
```

### Step 3: Configure Custom Sentences (Swedish)

Create or edit `config/custom_sentences/sv/shopping.yaml`:

```yaml
language: "sv"
intents:
  AddToShoppingList:
    data:
      - sentences:
          - "lägg till {item} på köplistan"
          - "lägg till {item} på inköpslistan"
          - "lägg till {item}"
          - "köp {item}"
          - "handla {item}"
  
lists:
  item:
    wildcard: true
```

### Step 4: Configure Custom Sentences (English)

Create or edit `config/custom_sentences/en/shopping.yaml`:

```yaml
language: "en"
intents:
  AddToShoppingList:
    data:
      - sentences:
          - "add {item} to [the] shopping list"
          - "add {item} to [the] grocery list"
          - "add {item}"
          - "buy {item}"
          - "get {item}"
  
lists:
  item:
    wildcard: true
```

### Step 5: Restart Home Assistant

1. Go to **Settings** → **System** → **Restart**
2. Wait for Home Assistant to restart

### Step 6: Test the Integration

Try these voice commands (if using Google Assistant):

**Swedish:**
- "Hej Google, lägg till mjölk på köplistan"
- "Hej Google, köp ägg"
- "Hej Google, handla bröd"

**English:**
- "Hey Google, add milk to the shopping list"
- "Hey Google, buy eggs"
- "Hey Google, get bread"

## Google Home Integration

To use this with Google Home speakers:

1. **Link Google Assistant to Home Assistant:**
   - Open the Google Home app
   - Go to **Settings** → **Works with Google**
   - Search for "Home Assistant Cloud" (requires Nabu Casa subscription) or set up manually
   - Follow the linking process

2. **Alternative - Manual Setup (Advanced):**
   - Requires exposing Home Assistant to the internet with HTTPS
   - Configure Google Actions manually through the Actions Console
   - See [Home Assistant Google Assistant documentation](https://www.home-assistant.io/integrations/google_assistant/)

3. **Use Voice Commands:**
   - Once linked, use the phrases configured in your custom sentences
   - Google Assistant will relay the command to Home Assistant
   - Home Assistant calls the Koplista API
   - The item appears in your list in real-time!

## Siri Shortcuts (iOS)

### Creating a Siri Shortcut

1. **Open Shortcuts app** on your iPhone or iPad
2. **Create a new shortcut:**
   - Tap the "+" button
   - Search for "Get Contents of URL"
3. **Configure the request:**
   - URL: `https://your-koplista-domain.com/api/external/add-item`
   - Method: `POST`
   - Headers:
     - Add header: `X-API-Key` = `your-api-key-here`
     - Add header: `Content-Type` = `application/json`
   - Request Body: `JSON`
     ```json
     {
       "itemName": "Text"
     }
     ```
   - Replace "Text" with "Ask Each Time" variable
4. **Add Siri phrase:**
   - Tap the shortcut name
   - Add to Siri
   - Record phrase like "Add to shopping list"
5. **Test it:**
   - Say "Hey Siri, add to shopping list"
   - Siri will ask what to add
   - Say the item name
   - Item is added to your default list!

### Advanced: Direct Item Shortcuts

You can also create shortcuts for specific items:

1. Create a shortcut as above but hardcode the item name in the JSON body
2. Name it something like "Add Milk"
3. Say "Hey Siri, add milk" to quickly add that item

## API Reference

### Endpoint

```
POST /api/external/add-item
```

### Headers

```
X-API-Key: your-api-key-here
Content-Type: application/json
```

### Request Body

```json
{
  "itemName": "mjölk",
  "listId": "optional-guid-if-not-using-default"
}
```

**Parameters:**
- `itemName` (required, string): The name of the item to add
- `listId` (optional, string): GUID of a specific list. If not provided, uses your default list

### Response

**Success (200 OK):**

```json
{
  "success": true,
  "item": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "mjölk",
    "quantity": 1,
    "isBought": false,
    "groceryListId": "123e4567-e89b-12d3-a456-426614174000",
    "createdAt": "2026-01-04T19:00:00Z",
    "updatedAt": "2026-01-04T19:00:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - No list specified and no default list set
- `401 Unauthorized` - Invalid or missing API key
- `403 Forbidden` - No access to the specified list
- `404 Not Found` - Specified list not found

## Real-Time Updates

When items are added via the external API:
- All connected clients viewing the list will see the new item immediately
- No manual refresh required
- Uses the same SignalR infrastructure as the web app

## Troubleshooting

### "Invalid API key" error

- Verify you copied the entire API key correctly
- Check for extra spaces or line breaks
- Ensure the key hasn't been deleted in Koplista settings
- Try generating a new key

### "No list specified and no default list set"

- Log into Koplista
- Go to Settings
- Set a default list in the dropdown
- Try the voice command again

### Items not appearing in the list

- Check that you have edit permissions for the list
- Verify the API key is active (check "Last Used" timestamp in settings)
- Look at Home Assistant logs for errors: **Settings** → **System** → **Logs**
- Test the API directly with curl:

```bash
curl -X POST https://your-koplista-domain.com/api/external/add-item \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"itemName": "test item"}'
```

### Home Assistant voice commands not working

- Verify Home Assistant can reach your Koplista instance
- Check `configuration.yaml` for syntax errors
- Ensure you restarted Home Assistant after configuration changes
- Test the REST command directly in Home Assistant Developer Tools:
  - Go to **Developer Tools** → **Services**
  - Select `rest_command.add_to_koplista`
  - Provide test data: `{"item": "test"}`
  - Check your Koplista list

### Google Assistant not triggering commands

- Verify Google Assistant is properly linked to Home Assistant
- Try re-syncing devices in Google Home app
- Check that your custom sentences are in the correct language
- Ensure you're using the exact phrases configured
- Check Home Assistant → **Settings** → **Voice Assistants** → **Assist**

### Siri Shortcut fails

- Check your Koplista URL is accessible from the internet (if using remotely)
- Verify API key is correct
- Look at the shortcut error message for details
- Ensure "Content-Type" header is set correctly
- Try the shortcut with a hardcoded item name first to isolate the issue

## Security Considerations

- **API keys are sensitive** - treat them like passwords
- Store API keys securely (Home Assistant secrets, iOS Keychain, etc.)
- **Revoke unused keys** - delete keys you're no longer using
- **Use HTTPS** - always access Koplista over HTTPS in production
- **Monitor key usage** - check the "Last Used" timestamp in settings
- Consider using different API keys for different integrations
- If a key is compromised, delete it immediately and generate a new one

## Advanced Usage

### Adding to Specific Lists

If you have multiple lists and want to add to a specific one (not the default):

1. Get the list ID from Koplista (visible in URL when viewing the list)
2. Include `listId` in your API request:

```json
{
  "itemName": "mjölk",
  "listId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Home Assistant Automations

You can trigger list additions from automations:

```yaml
automation:
  - alias: "Add milk when running low"
    trigger:
      - platform: numeric_state
        entity_id: sensor.fridge_milk_level
        below: 20
    action:
      - service: rest_command.add_to_koplista
        data:
          item: "mjölk"
```

### Multiple Languages

Home Assistant supports switching between languages. Create custom sentence files for each language you want to support, and Home Assistant will automatically use the appropriate one based on your configured language.

## Rate Limiting

To prevent abuse, the external API endpoint may be rate-limited. If you're building custom integrations:

- Limit requests to reasonable frequency
- Avoid hammering the API with rapid requests
- Implement exponential backoff on errors
- Contact the instance administrator if you need higher limits

## Support

For issues with:
- **Koplista API or Settings** - Check the GitHub repository issues
- **Home Assistant configuration** - See [Home Assistant documentation](https://www.home-assistant.io/)
- **Google Assistant** - Check [Google Assistant integration docs](https://www.home-assistant.io/integrations/google_assistant/)
- **Siri Shortcuts** - See [Apple Shortcuts documentation](https://support.apple.com/guide/shortcuts/)

## Example: Complete Home Assistant Configuration

Here's a complete example for Swedish language:

```yaml
# configuration.yaml

# REST command for Koplista
rest_command:
  add_to_koplista:
    url: "https://koplista.example.com/api/external/add-item"
    method: POST
    headers:
      X-API-Key: !secret koplista_api_key
      Content-Type: "application/json"
    payload: '{"itemName": "{{ item }}"}'

# Intent script
intent_script:
  AddToShoppingList:
    speech:
      text: "Lade till {{ item }} på köplistan"
    action:
      - service: rest_command.add_to_koplista
        data:
          item: "{{ item }}"
```

```yaml
# secrets.yaml
koplista_api_key: "your-actual-api-key-here"
```

```yaml
# config/custom_sentences/sv/shopping.yaml
language: "sv"
intents:
  AddToShoppingList:
    data:
      - sentences:
          - "lägg till {item} på köplistan"
          - "köp {item}"
          - "handla {item}"

lists:
  item:
    wildcard: true
```

This setup keeps your API key secure in `secrets.yaml` and provides natural Swedish language commands.
