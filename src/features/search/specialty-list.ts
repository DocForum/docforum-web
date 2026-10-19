// Human-readable joining of specialty names for the "Showing doctors in …"
// line, e.g. "Dermatology" / "Dermatology and Cardiology" /
// "Dermatology, Cardiology and General practice".
export function formatSpecialtyList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  const head = names.slice(0, -1).join(', ');
  return `${head} and ${names[names.length - 1]}`;
}
