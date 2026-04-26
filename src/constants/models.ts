import type { AIModel } from '../types';

export const AUTO_MODEL_ID = 'yandex-auto';

export const AI_MODELS: AIModel[] = [
  {
    id: AUTO_MODEL_ID,
    name: 'Yandex Auto',
    provider: 'internal',
    available: true,
    description: 'Автоподбор модели под ваш запрос',
  },
];
