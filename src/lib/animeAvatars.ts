/**
 * Anime Avatar System for SliceURL
 * Provides anime-style human avatars for user profiles
 */

// Import all avatar images
import male01 from '@/assets/avatars/male-01.png';
import male02 from '@/assets/avatars/male-02.png';
import male03 from '@/assets/avatars/male-03.png';
import male04 from '@/assets/avatars/male-04.png';
import male05 from '@/assets/avatars/male-05.png';
import male06 from '@/assets/avatars/male-06.png';
import male07 from '@/assets/avatars/male-07.png';
import male08 from '@/assets/avatars/male-08.png';
import male09 from '@/assets/avatars/male-09.png';
import male10 from '@/assets/avatars/male-10.png';
import male11 from '@/assets/avatars/male-11.png';
import male12 from '@/assets/avatars/male-12.png';
import male13 from '@/assets/avatars/male-13.png';
import male14 from '@/assets/avatars/male-14.png';
import male15 from '@/assets/avatars/male-15.png';

import female01 from '@/assets/avatars/female-01.png';
import female02 from '@/assets/avatars/female-02.png';
import female03 from '@/assets/avatars/female-03.png';
import female04 from '@/assets/avatars/female-04.png';
import female05 from '@/assets/avatars/female-05.png';
import female06 from '@/assets/avatars/female-06.png';
import female07 from '@/assets/avatars/female-07.png';
import female08 from '@/assets/avatars/female-08.png';
import female09 from '@/assets/avatars/female-09.png';
import female10 from '@/assets/avatars/female-10.png';
import female11 from '@/assets/avatars/female-11.png';
import female12 from '@/assets/avatars/female-12.png';
import female13 from '@/assets/avatars/female-13.png';
import female14 from '@/assets/avatars/female-14.png';
import female15 from '@/assets/avatars/female-15.png';

import neutral01 from '@/assets/avatars/neutral-01.png';
import neutral02 from '@/assets/avatars/neutral-02.png';
import neutral03 from '@/assets/avatars/neutral-03.png';
import neutral04 from '@/assets/avatars/neutral-04.png';
import neutral05 from '@/assets/avatars/neutral-05.png';

// Avatar arrays
export const maleAvatars: string[] = [
  male01, male02, male03, male04, male05,
  male06, male07, male08, male09, male10,
  male11, male12, male13, male14, male15
];

export const femaleAvatars: string[] = [
  female01, female02, female03, female04, female05,
  female06, female07, female08, female09, female10,
  female11, female12, female13, female14, female15
];

export const neutralAvatars: string[] = [
  neutral01, neutral02, neutral03, neutral04, neutral05
];

export const allAvatars: string[] = [...maleAvatars, ...femaleAvatars, ...neutralAvatars];

// Common male names for gender detection
const maleNames = new Set([
  // English/Western
  'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
  'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
  'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
  'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon',
  'benjamin', 'samuel', 'raymond', 'gregory', 'frank', 'alexander', 'patrick', 'jack', 'dennis', 'jerry',
  'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry', 'douglas', 'zachary', 'peter', 'kyle',
  'noah', 'ethan', 'jeremy', 'walter', 'christian', 'keith', 'roger', 'terry', 'austin', 'sean',
  'gerald', 'carl', 'dylan', 'harold', 'jordan', 'jesse', 'bryan', 'lawrence', 'arthur', 'gabriel',
  'bruce', 'logan', 'billy', 'joe', 'alan', 'juan', 'albert', 'willie', 'elijah', 'randy', 'wayne',
  'roy', 'vincent', 'ralph', 'eugene', 'russell', 'bobby', 'mason', 'philip', 'louis', 'liam', 'oliver',
  // Indian
  'raj', 'rahul', 'amit', 'vikram', 'sanjay', 'anil', 'suresh', 'rajesh', 'vijay', 'manoj',
  'deepak', 'sunil', 'ashok', 'ravi', 'arjun', 'karan', 'rohan', 'vishal', 'ajay', 'arun',
  'krishna', 'mohan', 'hari', 'ganesh', 'shiva', 'narendra', 'gautam', 'vivek', 'pradeep', 'dinesh',
  // Other cultures
  'mohammed', 'ahmed', 'ali', 'omar', 'hassan', 'abdul', 'khalid', 'tariq', 'yusuf', 'ibrahim',
  'wei', 'chen', 'ming', 'jun', 'hiroshi', 'takeshi', 'kenji', 'yuki', 'akira', 'shin',
  'carlos', 'miguel', 'luis', 'jorge', 'pedro', 'pablo', 'diego', 'andres', 'felipe', 'rafael'
]);

// Common female names for gender detection
const femaleNames = new Set([
  // English/Western
  'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
  'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle',
  'dorothy', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia',
  'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen',
  'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather',
  'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia', 'victoria', 'kelly', 'lauren', 'christina',
  'joan', 'evelyn', 'judith', 'megan', 'andrea', 'cheryl', 'hannah', 'jacqueline', 'martha', 'gloria',
  'teresa', 'ann', 'sara', 'madison', 'frances', 'kathryn', 'janice', 'jean', 'abigail', 'alice',
  'judy', 'sophia', 'grace', 'denise', 'amber', 'doris', 'marilyn', 'danielle', 'beverly', 'isabella',
  'theresa', 'diana', 'natalie', 'brittany', 'charlotte', 'marie', 'kayla', 'alexis', 'lori', 'ava', 'mia',
  // Indian
  'priya', 'neha', 'pooja', 'anjali', 'kavita', 'deepa', 'sunita', 'anita', 'rekha', 'sita',
  'lakshmi', 'meera', 'radha', 'geeta', 'rani', 'shanti', 'maya', 'nisha', 'asha', 'devi',
  'aisha', 'divya', 'shruti', 'sneha', 'riya', 'kritika', 'pallavi', 'rashmi', 'swati', 'tanvi',
  // Other cultures
  'fatima', 'aisha', 'zainab', 'maryam', 'khadija', 'layla', 'noor', 'sara', 'hana', 'amina',
  'yuki', 'sakura', 'aoi', 'mei', 'hana', 'rin', 'saki', 'yuna', 'miku', 'akiko',
  'maria', 'lucia', 'sofia', 'valentina', 'camila', 'gabriela', 'isabella', 'natalia', 'paula', 'andrea'
]);

export type Gender = 'male' | 'female' | 'neutral';

/**
 * Detect gender from a display name
 * Returns 'male', 'female', or 'neutral' if uncertain
 */
export function detectGenderFromName(name: string | null | undefined): Gender {
  if (!name) return 'neutral';
  
  // Get first name only
  const firstName = name.trim().split(/\s+/)[0]?.toLowerCase();
  if (!firstName) return 'neutral';
  
  // Check against known name lists
  if (maleNames.has(firstName)) return 'male';
  if (femaleNames.has(firstName)) return 'female';
  
  // Common name endings heuristics
  // Names ending in 'a' are often female (especially in many languages)
  if (firstName.endsWith('a') && firstName.length > 2) {
    // But some exceptions exist
    const maleExceptions = ['joshua', 'ezra', 'shiva', 'krishna', 'buddha'];
    if (!maleExceptions.includes(firstName)) {
      return 'female';
    }
  }
  
  // Names ending in these are often male
  const maleEndings = ['son', 'ton', 'ard', 'ert', 'rew', 'ley', 'ey'];
  for (const ending of maleEndings) {
    if (firstName.endsWith(ending) && firstName.length > ending.length + 1) {
      return 'male';
    }
  }
  
  return 'neutral';
}

/**
 * Get a random avatar from the specified pool
 */
export function getRandomAvatar(gender: Gender = 'neutral'): string {
  let pool: string[];
  
  switch (gender) {
    case 'male':
      pool = maleAvatars;
      break;
    case 'female':
      pool = femaleAvatars;
      break;
    default:
      pool = neutralAvatars;
  }
  
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get an avatar for a new user based on their display name
 */
export function getAvatarForNewUser(displayName: string | null | undefined): string {
  const gender = detectGenderFromName(displayName);
  return getRandomAvatar(gender);
}

/**
 * Get a different random avatar from the same gender pool
 */
export function regenerateAvatar(currentAvatar: string | null, gender: Gender = 'neutral'): string {
  let pool: string[];
  
  switch (gender) {
    case 'male':
      pool = maleAvatars;
      break;
    case 'female':
      pool = femaleAvatars;
      break;
    default:
      pool = neutralAvatars;
  }
  
  // If only one avatar in pool, return it
  if (pool.length <= 1) return pool[0];
  
  // Get a different avatar
  let newAvatar = pool[Math.floor(Math.random() * pool.length)];
  while (newAvatar === currentAvatar && pool.length > 1) {
    newAvatar = pool[Math.floor(Math.random() * pool.length)];
  }
  
  return newAvatar;
}

/**
 * Check if a URL is a SliceURL anime avatar
 */
export function isAnimeAvatar(url: string | null): boolean {
  if (!url) return false;
  return allAvatars.includes(url);
}

/**
 * Get the default/fallback avatar (first neutral)
 */
export function getDefaultAvatar(): string {
  return neutralAvatars[0];
}

/**
 * Get initials from a name for fallback avatar
 */
export function getInitials(name: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}
