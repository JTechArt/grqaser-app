/**
 * Duration parser for grqaser.org source format (e.g. "0ժ 51ր", "1ժ 30ր").
 * Converts to structured format (hours, minutes, total minutes) and normalized display string.
 */

/**
 * Parses source-site duration string (e.g. "0ժ 51ր", "1ժ 30ր") into structured format.
 * @param {string} sourceDuration - Raw duration from site (e.g. "0ժ 51ր")
 * @returns {{ totalMinutes: number, hours: number, minutes: number, formatted: string }}
 */
function parseDuration(sourceDuration) {
  const result = {
    totalMinutes: 0,
    hours: 0,
    minutes: 0,
    formatted: ''
  };

  if (sourceDuration == null || typeof sourceDuration !== 'string') {
    return result;
  }

  const trimmed = sourceDuration.trim();
  if (trimmed === '') {
    return result;
  }

  // Match Armenian format: Nժ Mր (hours and minutes)
  const armenianMatch = trimmed.match(/(\d+)\s*ժ\s*(\d+)\s*ր/);
  if (armenianMatch) {
    const hours = parseInt(armenianMatch[1], 10) || 0;
    const minutes = parseInt(armenianMatch[2], 10) || 0;
    result.hours = hours;
    result.minutes = minutes;
    result.totalMinutes = hours * 60 + minutes;
    result.formatted = trimmed;
    return result;
  }

  // Fallback: try generic "Nh Nm" or "N:NN" style
  const genericHoursMatch = trimmed.match(/(\d+)\s*h(?:our)?s?/i);
  const genericMinutesMatch = trimmed.match(/(\d+)\s*m(?:in)?s?/i);
  if (genericHoursMatch || genericMinutesMatch) {
    const hours = genericHoursMatch ? parseInt(genericHoursMatch[1], 10) : 0;
    const minutes = genericMinutesMatch ? parseInt(genericMinutesMatch[1], 10) : 0;
    result.hours = hours;
    result.minutes = minutes;
    result.totalMinutes = hours * 60 + minutes;
    result.formatted = result.totalMinutes > 0
      ? `${hours}ժ ${minutes}ր`
      : trimmed;
    return result;
  }

  // Single number as minutes
  const onlyMinutes = trimmed.match(/^(\d+)\s*ր?$/);
  if (onlyMinutes) {
    const minutes = parseInt(onlyMinutes[1], 10) || 0;
    result.minutes = minutes;
    result.totalMinutes = minutes;
    result.formatted = `${Math.floor(minutes / 60)}ժ ${minutes % 60}ր`;
    return result;
  }

  // Preserve original as formatted if we couldn't parse
  result.formatted = trimmed;
  return result;
}

/**
 * Normalizes duration for storage: returns integer total minutes and formatted string.
 * @param {string} sourceDuration - Raw duration from site
 * @returns {{ totalMinutes: number, formatted: string }}
 */
function normalizeDurationForStorage(sourceDuration) {
  const parsed = parseDuration(sourceDuration);
  return {
    totalMinutes: parsed.totalMinutes,
    formatted: parsed.formatted || (parsed.totalMinutes > 0 ? `${parsed.hours}ժ ${parsed.minutes}ր` : '')
  };
}

module.exports = {
  parseDuration,
  normalizeDurationForStorage
};
