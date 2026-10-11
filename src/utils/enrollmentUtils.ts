import { User } from '../types';

/**
 * Encodes adviserId into section description without requiring database schema changes.
 * e.g., "Main lecture room [adviser:teacher-123]"
 */
export function encodeSectionDescription(description?: string, adviserId?: string): string {
  const cleanDesc = (description || '').replace(/\[adviser:[^\]]+\]/g, '').trim();
  if (!adviserId) return cleanDesc;
  return cleanDesc ? `${cleanDesc} [adviser:${adviserId}]` : `[adviser:${adviserId}]`;
}

/**
 * Decodes raw section description into clean description and adviserId.
 */
export function decodeSectionDescription(rawDesc?: string): { description?: string; adviserId?: string } {
  if (!rawDesc) return { description: undefined, adviserId: undefined };
  const match = rawDesc.match(/\[adviser:([^\]]+)\]/);
  const adviserId = match ? match[1].trim() : undefined;
  const description = rawDesc.replace(/\[adviser:[^\]]+\]/g, '').trim() || undefined;
  return { description, adviserId };
}

/**
 * Parses comma-separated section IDs or array into clean string array.
 */
export function parseSectionIds(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Formats section IDs array into comma-separated string for database persistence.
 */
export function formatSectionIds(ids?: string[] | string): string | null {
  if (!ids) return null;
  if (typeof ids === 'string') {
    const list = ids.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list.join(',') : null;
  }
  const filtered = ids.map((s) => (s || '').trim()).filter(Boolean);
  const unique = Array.from(new Set(filtered));
  return unique.length > 0 ? unique.join(',') : null;
}

/**
 * Returns all section IDs a student is enrolled in.
 */
export function getStudentSectionIds(student?: User | null): string[] {
  if (!student) return [];
  const set = new Set<string>();
  if (student.sectionId) {
    student.sectionId.split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => set.add(id));
  }
  if (student.sectionIds && Array.isArray(student.sectionIds)) {
    student.sectionIds.map((s) => (s || '').trim()).filter(Boolean).forEach((id) => set.add(id));
  }
  return Array.from(set);
}

/**
 * Checks whether a student belongs to a given section ID.
 */
export function isStudentInSection(student?: User | null, sectionId?: string): boolean {
  if (!student || !sectionId) return false;
  const enrolledIds = getStudentSectionIds(student);
  return enrolledIds.includes(sectionId);
}
