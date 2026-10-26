export interface EnrolledStudentCandidate {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  rollNumber?: string | null;
  phone?: string | null;
  status?: string;
}

export interface VoiceMatchResult {
  exactMatches: EnrolledStudentCandidate[];
  fuzzyMatches: Array<{ student: EnrolledStudentCandidate; score: number }>;
  bestMatch: EnrolledStudentCandidate | null;
  status: 'EXACT_SINGLE' | 'EXACT_MULTIPLE' | 'FUZZY_SINGLE' | 'FUZZY_MULTIPLE' | 'NO_MATCH';
  cleanedQuery: string;
}

/**
 * Normalizes speech input by trimming whitespace, removing punctuation,
 * and filtering common attendance verbal noise (e.g., "present", "here sir", "roll no").
 */
export function normalizeSpeechTranscript(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip noise words when accompanied by a name
  const noiseWords = [
    'present',
    'here',
    'sir',
    'madam',
    'maam',
    'mam',
    'yes',
    'please',
    'mark',
    'attendance',
    'roll no',
    'roll number',
    'roll',
    'is present',
    'is here',
  ];

  for (const noise of noiseWords) {
    const regex = new RegExp(`\\b${noise}\\b`, 'gi');
    cleaned = cleaned.replace(regex, ' ').replace(/\s+/g, ' ').trim();
  }

  return cleaned;
}

/**
 * Standard Levenshtein distance implementation
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * Calculates normalized string similarity ratio between 0.0 and 1.0
 */
export function calculateSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1 - dist / maxLen;
}

/**
 * Matches a spoken transcript against enrolled students in an active batch.
 * Guarantees strict safety:
 * - Never auto-selects ambiguous / duplicate matches.
 * - Prioritizes exact full-name matches, then exact single-name matches.
 * - Falls back to conservative fuzzy matching (similarity >= 0.78).
 */
export function matchStudentVoice(
  spokenTranscript: string,
  enrolledStudents: EnrolledStudentCandidate[]
): VoiceMatchResult {
  const cleaned = normalizeSpeechTranscript(spokenTranscript);
  if (!cleaned || enrolledStudents.length === 0) {
    return {
      exactMatches: [],
      fuzzyMatches: [],
      bestMatch: null,
      status: 'NO_MATCH',
      cleanedQuery: cleaned,
    };
  }

  const exactFullMatches: EnrolledStudentCandidate[] = [];
  const exactTokenMatches: EnrolledStudentCandidate[] = [];

  for (const s of enrolledStudents) {
    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
    const fName = (s.firstName || '').trim().toLowerCase();
    const lName = (s.lastName || '').trim().toLowerCase();
    const adm = (s.admissionNumber || '').trim().toLowerCase();
    const cleanAdm = normalizeSpeechTranscript(s.admissionNumber || '');
    const cleanRoll = normalizeSpeechTranscript(s.rollNumber || '');

    // 1. Direct full name or admission number match
    if (
      cleaned === fullName ||
      cleaned === adm ||
      (cleanAdm && cleaned === cleanAdm) ||
      (cleanRoll && cleaned === cleanRoll)
    ) {
      exactFullMatches.push(s);
      continue;
    }

    // 2. Exact single-name match (e.g. only first name or only last name spoken)
    if (cleaned === fName || (lName && cleaned === lName)) {
      exactTokenMatches.push(s);
    }
  }

  // Exact full name match takes highest priority
  if (exactFullMatches.length === 1) {
    return {
      exactMatches: exactFullMatches,
      fuzzyMatches: [],
      bestMatch: exactFullMatches[0],
      status: 'EXACT_SINGLE',
      cleanedQuery: cleaned,
    };
  }

  if (exactFullMatches.length > 1) {
    return {
      exactMatches: exactFullMatches,
      fuzzyMatches: [],
      bestMatch: null, // Ambiguous duplicate!
      status: 'EXACT_MULTIPLE',
      cleanedQuery: cleaned,
    };
  }

  // Exact single-name match
  if (exactTokenMatches.length === 1) {
    return {
      exactMatches: exactTokenMatches,
      fuzzyMatches: [],
      bestMatch: exactTokenMatches[0],
      status: 'EXACT_SINGLE',
      cleanedQuery: cleaned,
    };
  }

  if (exactTokenMatches.length > 1) {
    return {
      exactMatches: exactTokenMatches,
      fuzzyMatches: [],
      bestMatch: null, // Multiple students share the same first/last name!
      status: 'EXACT_MULTIPLE',
      cleanedQuery: cleaned,
    };
  }

  // 3. Conservative Fuzzy Matching
  // Check similarity against full name and first name
  const fuzzyScored: Array<{ student: EnrolledStudentCandidate; score: number }> = [];

  for (const s of enrolledStudents) {
    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
    const fName = (s.firstName || '').trim().toLowerCase();

    const fullScore = calculateSimilarity(cleaned, fullName);
    const firstScore = calculateSimilarity(cleaned, fName);
    const bestScore = Math.max(fullScore, firstScore);

    // Conservative threshold: 0.78
    if (bestScore >= 0.78) {
      fuzzyScored.push({ student: s, score: bestScore });
    }
  }

  // Sort descending by score
  fuzzyScored.sort((a, b) => b.score - a.score);

  if (fuzzyScored.length === 1) {
    return {
      exactMatches: [],
      fuzzyMatches: fuzzyScored,
      bestMatch: fuzzyScored[0].student,
      status: 'FUZZY_SINGLE',
      cleanedQuery: cleaned,
    };
  }

  if (fuzzyScored.length > 1) {
    // If multiple students are close, never auto-pick
    return {
      exactMatches: [],
      fuzzyMatches: fuzzyScored,
      bestMatch: null,
      status: 'FUZZY_MULTIPLE',
      cleanedQuery: cleaned,
    };
  }

  return {
    exactMatches: [],
    fuzzyMatches: [],
    bestMatch: null,
    status: 'NO_MATCH',
    cleanedQuery: cleaned,
  };
}
