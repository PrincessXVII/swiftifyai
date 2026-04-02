import type { Message } from '../types';
import { streamChatCompletion, type OpenAIMessage } from './openai';

export async function streamChatSummary(
  messages: Message[],
  modelId: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const lines = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => (m.role === 'user' ? `Пользователь: ${m.content}` : `Ассистент: ${m.content}`));
  let body = lines.join('\n\n');
  const max = 14000;
  if (body.length > max) {
    body = body.slice(-max);
  }

  const req: OpenAIMessage[] = [
    {
      role: 'system',
      content:
        'Ты кратко резюмируешь диалоги на русском языке. Отвечай только текстом резюме, без вступлений и заголовков вроде «Резюме:».',
    },
    {
      role: 'user',
      content: `Ниже переписка (возможно обрезана с начала). Сделай краткое резюме: 5–10 предложений, ключевые факты и выводы.\n\n---\n${body}`,
    },
  ];

  await streamChatCompletion(req, modelId, onChunk, { kind: 'summary' });
}
