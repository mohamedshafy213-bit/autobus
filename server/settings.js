import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsFile = path.join(__dirname, '..', 'data', 'settings.json');

const DEFAULT_SETTINGS = {
  busCount: 28,
  defaultMaxFamilies: 8,
  defaultMaxPersons: 40,
  overrides: {}
};

/**
 * Read current settings from data/settings.json or create defaults
 */
export function getSettings() {
  try {
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf8');
      const parsed = JSON.parse(data);
      return {
        busCount: Number(parsed.busCount) || DEFAULT_SETTINGS.busCount,
        defaultMaxFamilies: Number(parsed.defaultMaxFamilies) || DEFAULT_SETTINGS.defaultMaxFamilies,
        defaultMaxPersons: Number(parsed.defaultMaxPersons) || DEFAULT_SETTINGS.defaultMaxPersons,
        overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {}
      };
    }
  } catch (err) {
    console.error('Error reading settings.json:', err);
  }

  // If file doesn't exist, save and return defaults
  saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}

/**
 * Write updated settings to data/settings.json
 */
export function saveSettings(newSettings) {
  const dir = path.dirname(settingsFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const cleanSettings = {
    busCount: Math.max(1, Number(newSettings.busCount) || DEFAULT_SETTINGS.busCount),
    defaultMaxFamilies: Math.max(1, Number(newSettings.defaultMaxFamilies) || DEFAULT_SETTINGS.defaultMaxFamilies),
    defaultMaxPersons: Math.max(1, Number(newSettings.defaultMaxPersons) || DEFAULT_SETTINGS.defaultMaxPersons),
    overrides: newSettings.overrides && typeof newSettings.overrides === 'object' ? newSettings.overrides : {}
  };

  fs.writeFileSync(settingsFile, JSON.stringify(cleanSettings, null, 2), 'utf8');
  return cleanSettings;
}

/**
 * Get effective limits for a specific bus number
 */
export function getBusLimits(busNumber, settings = null) {
  const s = settings || getSettings();
  const busKey = String(busNumber);
  const override = s.overrides[busKey];

  return {
    maxFamilies: override && override.maxFamilies !== undefined ? Number(override.maxFamilies) : s.defaultMaxFamilies,
    maxPersons: override && override.maxPersons !== undefined ? Number(override.maxPersons) : s.defaultMaxPersons
  };
}

export default {
  getSettings,
  saveSettings,
  getBusLimits
};
