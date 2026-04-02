export function generateTitle(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return 'Новый чат';
  const clean = trimmed.replace(/\s+/g, ' ');
  return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean;
}
