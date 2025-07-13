# Module: Configuration System

---

## 📌 Overview

The Lonx OS configuration system provides a simple and persistent way to store system-wide settings. It is built around a single JSON file stored in the virtual filesystem, which is itself persisted in the browser's `localStorage`.

---

## 🧱 Data Structure & API

The configuration is managed through a set of simple, exported functions. There is no central class.

**Location:** `/os/core/config.ts`

**The `config.json` File:**
The configuration is stored at the virtual path `/etc/config.json`. A typical config file looks like this:
```json
{
  "identity": {
    "username": "user",
    "hostname": "lonx"
  },
  "theme": {
    "background": "#000000",
    "foreground": "#FFFFFF"
  },
  "system": {
    "mim_repository": "https://example.com/packages.json"
  }
}
```

**Core API Functions:**
```typescript
// Checks if a config file exists.
function configExists(): boolean;

// Retrieves the entire parsed configuration object.
function getConfig(): any;

// Overwrites the entire configuration.
function setConfig(configObj: any): void;

// Updates a single value using a dot-separated path.
function updateConfig(keyPath: string, value: any): void;

// Resets the configuration to the default state.
function resetConfig(): void;

// Creates the initial default configuration.
function createDefaultConfig(): void;
```

---

## 🧪 Sample Usage

**Reading a configuration value:**
```typescript
import { getConfig } from './os/core/config.js';

const config = getConfig();
const username = config.identity.username;
```

**Updating a configuration value:**
```typescript
import { updateConfig } from './os/core/config.js';

// Update the shell prompt's hostname
updateConfig("identity.hostname", "lonx-dev");
```

**Creating the initial config during onboarding:**
```typescript
import { createDefaultConfig, updateConfig } from './os/core/config.js';

// Create the base config
createDefaultConfig();

// Set the user's chosen name
updateConfig("identity.username", "my-new-user");
```

---

## ⚠️ Limitations

- **No Schema Validation:** The system does not enforce any schema on the `config.json` file. A corrupted or malformed file can cause runtime errors in modules that depend on it.
- **No Live Reloading:** When the configuration is changed, modules will not automatically update. They will only see the new values the next time they call `getConfig()`.
- **Single Config File:** The entire system relies on one global configuration file. There is no support for per-user or per-application configuration files.

---

## 🔧 How to Extend

- **Add Schema Validation:** A JSON schema could be defined for the configuration. The `setConfig` and `updateConfig` functions could then validate any changes against this schema before saving.
- **Implement a Pub/Sub Model:** An event emitter could be added to the config module. When `updateConfig` is called, it could emit an event (e.g., `config:updated`). Other modules could subscribe to this event to live-reload their settings.
- **Support for Multiple Config Files:** The API could be extended to accept a file path, allowing for more granular configuration (e.g., `getConfig('/etc/app.conf')`).
