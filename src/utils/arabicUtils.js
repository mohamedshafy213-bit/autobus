/**
 * Arabic text normalization and utility functions
 */

// Normalize Arabic diacritics and character variations for robust search
export function normalizeArabic(text) {
  if (!text) return '';
  let str = String(text).trim();

  // Remove Tashkeel / Harakat (Fatha, Tanween, Damma, Kasra, Sukun, Shadda, etc.)
  str = str.replace(/[\u0617-\u061A\u064B-\u0652\u0670]/g, '');

  // Remove Tatweel (Kashida ـ)
  str = str.replace(/\u0640/g, '');

  // Normalize Alef variations (أ, إ, آ, ٱ) -> ا
  str = str.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');

  // Normalize Taa Marbuta (ة) -> ه
  str = str.replace(/\u0629/g, '\u0647');

  // Normalize Alef Maksura (ى) -> ي
  str = str.replace(/\u0649/g, '\u064A');

  // Normalize Arabic-Indic Digits (٠-٩) to Standard (0-9)
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    str = str.split(arabicDigits[i]).join(String(i));
  }

  return str.toLowerCase().trim();
}

/**
 * Checks if a search query matches a target text, tolerant to Arabic variations
 */
export function matchesArabicQuery(target, query) {
  if (!query) return true;
  if (!target) return false;
  
  const normTarget = normalizeArabic(target);
  const normQuery = normalizeArabic(query);
  
  return normTarget.includes(normQuery);
}

/**
 * Formats a timestamp into an Arabic time string (e.g. 10:30 ص)
 */
export function formatArabicTime(timestamp) {
  if (!timestamp) return '—';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '—';
  }
}

/**
 * Formats a date into Arabic readable format
 */
export function formatArabicDate(timestamp = Date.now()) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}
