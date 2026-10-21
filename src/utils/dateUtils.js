/**
 * Universal Date Formatting Utilities for MasterDataApp
 * Formats dates into DD/MM/YYYY (or custom separator) format.
 */

export function formatDate(input, separator = '/') {
  if (!input) return '';

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // If already in DD/MM/YYYY or DD-MM-YYYY format
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})/);
    if (ddmmyyyyMatch) {
      const dd = ddmmyyyyMatch[1].padStart(2, '0');
      const mm = ddmmyyyyMatch[2].padStart(2, '0');
      const yyyy = ddmmyyyyMatch[3];
      return `${dd}${separator}${mm}${separator}${yyyy}`;
    }

    // If in YYYY-MM-DD or YYYY/MM/DD or ISO format (e.g. 2026-10-21 or 2026-10-21T06:35:10Z)
    const yyyymmddMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmddMatch) {
      const yyyy = yyyymmddMatch[1];
      const mm = yyyymmddMatch[2].padStart(2, '0');
      const dd = yyyymmddMatch[3].padStart(2, '0');
      return `${dd}${separator}${mm}${separator}${yyyy}`;
    }
  }

  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}${separator}${mm}${separator}${yyyy}`;
}

/**
 * Returns safe Date object for DateTimePicker components
 */
export function parseSafeDate(input) {
  if (!input) return new Date();
  if (input instanceof Date && !isNaN(input.getTime())) return input;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Check YYYY-MM-DD
    const ymd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymd) {
      return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    }
    // Check DD/MM/YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    }
  }

  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Returns today's date formatted as DD/MM/YYYY
 */
export function getTodayFormatted(separator = '/') {
  return formatDate(new Date(), separator);
}
