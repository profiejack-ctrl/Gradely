/**
 * Utilities for extracting, formatting, and sorting student names
 */

export const getLastName = (fullName: string): string => {
  if (!fullName) return '';
  const trimmed = fullName.trim();

  // If format is already "Last, First" or "Last, First Middle"
  if (trimmed.includes(',')) {
    return trimmed.split(',')[0].trim();
  }

  // If format is "First [Middle] Last"
  const parts = trimmed.split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
};

export const getFirstName = (fullName: string): string => {
  if (!fullName) return '';
  const trimmed = fullName.trim();

  // If format is "Last, First"
  if (trimmed.includes(',')) {
    return trimmed.split(',').slice(1).join(' ').trim();
  }

  // If format is "First [Middle] Last"
  const parts = trimmed.split(/\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || '';
};

export const formatLastFirst = (fullName: string): string => {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (trimmed.includes(',')) return trimmed;

  const lastName = getLastName(trimmed);
  const firstName = getFirstName(trimmed);
  return firstName ? `${lastName}, ${firstName}` : lastName;
};

export const compareByLastName = (
  nameA: string,
  nameB: string,
  direction: 'asc' | 'desc' = 'asc'
): number => {
  const lastA = getLastName(nameA).toLowerCase();
  const lastB = getLastName(nameB).toLowerCase();

  const primaryDiff = lastA.localeCompare(lastB);
  if (primaryDiff !== 0) {
    return direction === 'asc' ? primaryDiff : -primaryDiff;
  }

  // Tie-breaker: compare full name
  const secondaryDiff = nameA.toLowerCase().localeCompare(nameB.toLowerCase());
  return direction === 'asc' ? secondaryDiff : -secondaryDiff;
};
