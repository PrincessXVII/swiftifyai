import type { AIModel } from '../types';

export const AI_MODELS: AIModel[] = [
  {
    id: 'yandex-balanced',
    name: 'Yandex Balanced',
    provider: 'internal',
    available: true,
    description: 'Универсальная модель для повседневных задач',
  },
  {
    id: 'yandex-fast',
    name: 'Yandex Fast',
    provider: 'internal',
    available: true,
    description: 'Быстрые короткие ответы и легкие запросы',
  },
  {
    id: 'yandex-pro',
    name: 'Yandex Pro',
    provider: 'internal',
    available: true,
    description: 'Сложные задачи, анализ и длинные ответы',
  },
];
