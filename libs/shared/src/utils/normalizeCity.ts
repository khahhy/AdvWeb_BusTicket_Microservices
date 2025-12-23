/**
 * Normalize Vietnamese city names for consistent comparison
 * Removes diacritics, converts to lowercase, and standardizes spaces
 */
export function normalizeCity(cityName: string): string {
  if (!cityName) return '';

  return cityName
    .toLowerCase()
    .normalize('NFD') // Decompose diacritical marks
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/đ/g, 'd') // Replace Vietnamese đ
    .replace(/Đ/g, 'd') // Replace Vietnamese Đ
    .trim()
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
}
