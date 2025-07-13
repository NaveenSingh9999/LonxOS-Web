// /os/core/config.ts
import { DEFAULT_CONFIG } from './constants.js';

const CONFIG_PATH = '/etc/config.json';

/**
 * Checks if the global configuration file exists in localStorage.
 * @returns {boolean} True if the config exists, false otherwise.
 */
export function configExists(): boolean {
  return localStorage.getItem(CONFIG_PATH) !== null;
}

/**
 * Retrieves the full configuration object from localStorage.
 * @returns {object | null} The parsed configuration object, or null if it doesn't exist.
 */
export function getConfig(): any {
  const configStr = localStorage.getItem(CONFIG_PATH);
  if (!configStr) {
    return null;
  }
  try {
    return JSON.parse(configStr);
  } catch (e) {
    console.error("Error parsing config.json:", e);
    return null; // Return null if config is corrupted
  }
}

/**
 * Overwrites the entire configuration object in localStorage.
 * @param {object} configObj The new configuration object.
 */
export function setConfig(configObj: any): void {
  try {
    const configStr = JSON.stringify(configObj, null, 2);
    localStorage.setItem(CONFIG_PATH, configStr);
  } catch (e) {
    console.error("Error saving config.json:", e);
  }
}

/**
 * Updates a specific key in the configuration object using a key path.
 * @param {string} keyPath A dot-separated path to the key (e.g., "identity.username").
 * @param {any} value The new value to set.
 */
export function updateConfig(keyPath: string, value: any): void {
  const config = getConfig();
  if (!config) {
    return;
  }

  const keys = keyPath.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  setConfig(config);
}

/**
 * Resets the configuration to the default state.
 */
export function resetConfig(): void {
    localStorage.removeItem(CONFIG_PATH);
}

/**
 * Creates and saves the initial default configuration.
 */
export function createDefaultConfig(): void {
    setConfig(DEFAULT_CONFIG);
}
