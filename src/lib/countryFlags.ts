// Country code to flag emoji mapping
const countryFlags: Record<string, string> = {
  'India': '🇮🇳',
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'Nepal': '🇳🇵',
  'Bangladesh': '🇧🇩',
  'Pakistan': '🇵🇰',
  'Sri Lanka': '🇱🇰',
  'Canada': '🇨🇦',
  'Australia': '🇦🇺',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Japan': '🇯🇵',
  'China': '🇨🇳',
  'Brazil': '🇧🇷',
  'Russia': '🇷🇺',
  'South Africa': '🇿🇦',
  'Mexico': '🇲🇽',
  'Spain': '🇪🇸',
  'Italy': '🇮🇹',
  'Netherlands': '🇳🇱',
  'Singapore': '🇸🇬',
  'Malaysia': '🇲🇾',
  'Indonesia': '🇮🇩',
  'Philippines': '🇵🇭',
  'Thailand': '🇹🇭',
  'Vietnam': '🇻🇳',
  'South Korea': '🇰🇷',
  'United Arab Emirates': '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  'Nigeria': '🇳🇬',
  'Kenya': '🇰🇪',
  'Egypt': '🇪🇬',
  'Turkey': '🇹🇷',
  'Poland': '🇵🇱',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Finland': '🇫🇮',
  'Ireland': '🇮🇪',
  'New Zealand': '🇳🇿',
  'Argentina': '🇦🇷',
  'Chile': '🇨🇱',
  'Colombia': '🇨🇴',
  'Peru': '🇵🇪',
  'Unknown': '🌍'
};

export function getCountryFlag(country: string): string {
  return countryFlags[country] || '🌍';
}

export function getTopCountryFlags(countryStats: { name: string; value: number }[], limit = 3): string[] {
  return countryStats
    .slice(0, limit)
    .map(stat => getCountryFlag(stat.name));
}
