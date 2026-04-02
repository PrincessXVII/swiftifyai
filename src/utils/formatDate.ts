import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return 'Сегодня';
  if (isYesterday(date)) return 'Вчера';
  return format(date, 'd MMM', { locale: ru });
}
