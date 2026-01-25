// Client-side deterministic avatar generator
// Generates unique avatars based on seed (name + email + country)

interface AvatarOptions {
  seed: string;
  darkMode: boolean;
  size?: number;
}

// Simple hash function for deterministic results
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate HSL color based on hash
function generateColor(hash: number, offset: number, darkMode: boolean): string {
  const hue = (hash + offset * 40) % 360;
  
  if (darkMode) {
    // Darker, more saturated colors for dark mode
    const saturation = 50 + (hash % 30);
    const lightness = 35 + (hash % 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } else {
    // Pastel colors for light mode
    const saturation = 60 + (hash % 30);
    const lightness = 75 + (hash % 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

// Generate a geometric pattern avatar as SVG
export function generateAvatarSvg({ seed, darkMode, size = 128 }: AvatarOptions): string {
  const hash = hashCode(seed);
  
  // Generate colors
  const bgColor = generateColor(hash, 0, darkMode);
  const primaryColor = generateColor(hash, 3, darkMode);
  const secondaryColor = generateColor(hash, 6, darkMode);
  const accentColor = generateColor(hash, 9, darkMode);
  
  // Determine pattern type based on hash
  const patternType = hash % 4;
  
  let pattern = '';
  
  switch (patternType) {
    case 0: // Circles pattern
      const numCircles = 3 + (hash % 4);
      for (let i = 0; i < numCircles; i++) {
        const cx = ((hash + i * 17) % 80) + 10;
        const cy = ((hash + i * 23) % 80) + 10;
        const r = 15 + (hash + i * 7) % 25;
        const color = i % 2 === 0 ? primaryColor : secondaryColor;
        pattern += `<circle cx="${cx}%" cy="${cy}%" r="${r}%" fill="${color}" opacity="0.7"/>`;
      }
      break;
      
    case 1: // Polygon/geometric pattern
      const points1 = `${10 + hash % 20},${80 - hash % 20} ${50},${10 + hash % 15} ${90 - hash % 20},${80 - hash % 20}`;
      const points2 = `${20 + hash % 15},${20 + hash % 20} ${80 - hash % 15},${20 + hash % 20} ${50},${70 + hash % 20}`;
      pattern = `
        <polygon points="${points1}" fill="${primaryColor}" opacity="0.8"/>
        <polygon points="${points2}" fill="${secondaryColor}" opacity="0.6"/>
      `;
      break;
      
    case 2: // Concentric shapes
      pattern = `
        <circle cx="50%" cy="50%" r="45%" fill="${primaryColor}" opacity="0.8"/>
        <circle cx="50%" cy="50%" r="30%" fill="${secondaryColor}" opacity="0.9"/>
        <circle cx="50%" cy="50%" r="15%" fill="${accentColor}" opacity="1"/>
      `;
      break;
      
    case 3: // Grid pattern
      const gridSize = 3;
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const cellHash = (hash + row * 7 + col * 13) % 3;
          if (cellHash > 0) {
            const x = (col * 33) + 5;
            const y = (row * 33) + 5;
            const color = cellHash === 1 ? primaryColor : secondaryColor;
            pattern += `<rect x="${x}%" y="${y}%" width="28%" height="28%" rx="4" fill="${color}" opacity="0.8"/>`;
          }
        }
      }
      break;
  }
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      ${pattern}
    </svg>
  `.trim();
  
  return svg;
}

// Convert SVG to data URL for use in img src
export function generateAvatarDataUrl(options: AvatarOptions): string {
  const svg = generateAvatarSvg(options);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}

// Generate avatar URL based on user data
export function getGeneratedAvatarUrl(
  name: string | null | undefined,
  email: string | null | undefined,
  country: string | null | undefined,
  darkMode: boolean
): string {
  const seed = `${name || ''}${email || ''}${country || ''}`.toLowerCase();
  return generateAvatarDataUrl({ seed, darkMode });
}
