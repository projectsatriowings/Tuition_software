import { Prisma, PrismaClient } from '@prisma/client';

export const DEFAULT_SERIAL_WIDTH = 3;
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Format admission number according to {INSTITUTE_PREFIX}-{YEAR}-{SERIAL}
 * Serial width expands naturally beyond 999 (e.g., 001..999, 1000, 1001)
 */
export function formatAdmissionNumber(
  prefix: string,
  year: number,
  serial: number,
  minWidth = DEFAULT_SERIAL_WIDTH
): string {
  const serialStr = String(serial).padStart(minWidth, '0');
  return `${prefix.toUpperCase()}-${year}-${serialStr}`;
}

/**
 * Derive the admission year based on Asia/Kolkata timezone
 */
export function getAdmissionYear(dateInput?: Date | string | null, timeZone = DEFAULT_TIMEZONE): number {
  const date = dateInput ? new Date(dateInput) : new Date();
  const validDate = isNaN(date.getTime()) ? new Date() : date;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
  });
  return parseInt(formatter.format(validDate), 10);
}

/**
 * Derive initial candidate prefix from institute name using a normalized, readable abbreviation.
 * Example: 'Apex Science Academy' -> 'APEX'
 */
export function deriveCandidatePrefix(name: string): string {
  if (!name || !name.trim()) {
    return 'INST';
  }

  // Remove special characters, keep letters and digits
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 'INST';
  }

  const genericWords = new Set(['THE', 'OF', 'FOR', 'AND', 'IN', 'AT', 'AN', 'A']);
  const significantWords = words.filter((w) => !genericWords.has(w));
  const effectiveWords = significantWords.length > 0 ? significantWords : words;

  const firstWord = effectiveWords[0];

  // If first word is between 3 and 8 chars, it's ideal (e.g. APEX, OXFORD, BRIGHT)
  if (firstWord.length >= 3 && firstWord.length <= 8) {
    return firstWord;
  }

  // If first word is short (< 3 chars) like "ST" in "ST MARYS SCHOOL", combine first 2 words
  if (firstWord.length < 3 && effectiveWords.length >= 2) {
    const combined = (firstWord + effectiveWords[1]).slice(0, 8);
    if (combined.length >= 3) {
      return combined;
    }
  }

  // If multiple words, try acronym of first letters
  if (effectiveWords.length >= 3) {
    const acronym = effectiveWords.map((w) => w[0]).join('');
    if (acronym.length >= 3 && acronym.length <= 8) {
      return acronym;
    }
  }

  // Fallback: take first 3 to 6 alphanumeric characters
  const condensed = cleaned.replace(/\s+/g, '');
  return condensed.slice(0, Math.min(6, Math.max(3, condensed.length))) || 'INST';
}

/**
 * Persist or fetch a stable, unique admission prefix for the given institute.
 * Resolves collisions across institutes deterministically without altering existing ones.
 */
export async function getOrSetInstitutePrefix(
  db: PrismaClient | Prisma.TransactionClient,
  instituteId: string
): Promise<string> {
  const institute = await db.institute.findUnique({
    where: { id: instituteId },
    select: { id: true, name: true, admissionPrefix: true },
  });

  if (!institute) {
    throw new Error(`Institute not found for ID: ${instituteId}`);
  }

  // If stable prefix is already set, return it immediately (do not recalculate on name change)
  if (institute.admissionPrefix) {
    return institute.admissionPrefix;
  }

  // Derive candidate prefix
  const baseCandidate = deriveCandidatePrefix(institute.name);

  // Check for collisions across institutes
  let resolvedPrefix = baseCandidate;
  let counter = 1;

  while (true) {
    const collision = await db.institute.findFirst({
      where: {
        admissionPrefix: resolvedPrefix,
        id: { not: instituteId },
      },
      select: { id: true },
    });

    if (!collision) {
      break;
    }

    // Deterministic collision resolution: append sequential suffix e.g. APEX2, APEX3
    counter++;
    resolvedPrefix = `${baseCandidate}${counter}`;
  }

  // Persist the stable prefix on the institute
  await db.institute.update({
    where: { id: instituteId },
    data: { admissionPrefix: resolvedPrefix },
  });

  return resolvedPrefix;
}

/**
 * Concurrency-safe atomic generation of the next admission number for an institute.
 * Must be executed within a database transaction.
 */
export async function generateNextAdmissionNumber(
  tx: Prisma.TransactionClient,
  instituteId: string,
  admissionDateInput?: Date | string | null,
  minSerialWidth = DEFAULT_SERIAL_WIDTH
): Promise<{ admissionNumber: string; year: number; serial: number; prefix: string }> {
  // 1. Get or establish permanent institute prefix
  const prefix = await getOrSetInstitutePrefix(tx, instituteId);

  // 2. Determine admission year in Asia/Kolkata
  const year = getAdmissionYear(admissionDateInput);

  // 3. Atomically upsert sequence counter (row-locked in PostgreSQL)
  const sequence = await tx.admissionSequence.upsert({
    where: {
      instituteId_year: {
        instituteId,
        year,
      },
    },
    create: {
      instituteId,
      year,
      lastSerial: 1,
    },
    update: {
      lastSerial: {
        increment: 1,
      },
    },
  });

  let serial = sequence.lastSerial;
  let admissionNumber = formatAdmissionNumber(prefix, year, serial, minSerialWidth);

  // 4. Ensure safety against any legacy records that were manually inserted before
  // If a student already exists with this admissionNumber, advance the counter safely
  while (
    await tx.student.findUnique({
      where: {
        instituteId_admissionNumber: {
          instituteId,
          admissionNumber,
        },
      },
      select: { id: true },
    })
  ) {
    const advanced = await tx.admissionSequence.update({
      where: {
        instituteId_year: {
          instituteId,
          year,
        },
      },
      data: {
        lastSerial: {
          increment: 1,
        },
      },
    });

    serial = advanced.lastSerial;
    admissionNumber = formatAdmissionNumber(prefix, year, serial, minSerialWidth);
  }

  return {
    admissionNumber,
    year,
    serial,
    prefix,
  };
}
