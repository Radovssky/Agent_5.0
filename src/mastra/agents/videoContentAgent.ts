import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { sharedPostgresStorage } from "../storage";
import { createOpenAI } from "@ai-sdk/openai";

// Импорт всех инструментов
import {
  sessionManagerTool,
  videoStorageTool,
  getFoundVideosTool,
  scriptStorageTool,
  activityLoggerTool,
} from "../tools/databaseTools";

import {
  youtubeSearchTool,
  tiktokSearchTool,
  instagramSearchTool,
  multiPlatformSearchTool,
} from "../tools/videoSearchTools";

import {
  videoTranscriptionTool,
  videoMetricsAnalysisTool,
  comprehensiveContentAnalysisTool,
} from "../tools/contentAnalysisTools";

import {
  generateScriptTool,
  improveScriptTool,
  validateScriptTool,
} from "../tools/scriptGenerationTools";

// Telegram tools не должны быть в агенте - они используются только в workflow

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  apiKey: process.env.OPENAI_API_KEY,
});

export const videoContentAgent = new Agent({
  name: "Video Content Agent",
  instructions: `Вы - Video Content Agent для создания видеоконтента.

АЛГОРИТМ (КРАТКО):
1. Создать сессию пользователя (sessionManagerTool)
2. Найти видео по теме (multiPlatformSearchTool) 
3. ПРОВЕРИТЬ РЕЗУЛЬТАТЫ:
   - Если видео найдены → анализ + сценарий
   - Если НЕТ видео → объяснить проблему + советы
4. Проанализировать контент (comprehensiveContentAnalysisTool) - ТОЛЬКО если есть видео
5. Создать сценарий (generateScriptTool) - ТОЛЬКО если есть видео  
6. Отправить КОРОТКИЙ ответ

ОБРАБОТКА ПУСТЫХ РЕЗУЛЬТАТОВ:
Если multiPlatformSearchTool НЕ нашел видео (success: false):
- НЕ вызывайте comprehensiveContentAnalysisTool
- НЕ вызывайте generateScriptTool  
- Объясните пользователю что произошло
- Предложите альтернативные темы или проверить API ключи

ВАЖНО - ОТВЕЧАЙТЕ КРАТКО:
- Максимум 300-500 слов в ответе
- Не повторяйте длинные описания
- Фокус на главном: найденные видео + сценарий
- Если ошибки - простое объяснение без деталей

ФОРМАТ ВЫВОДА ВИДЕО:
При включении найденных видео в ответ пользователю используйте специальный формат:
🎬 ВИДЕО: [Название] - [ссылка] ([платформа], [просмотры/лайки])

Пример:
🎬 ВИДЕО: Как готовить пасту за 5 минут - https://youtube.com/watch?v=abc123 (YouTube, 2.5M просмотров)

🎬 ВИДЕО: Быстрая паста - https://tiktok.com/@user/video/123 (TikTok, 500K лайков)

Этот формат обеспечит автоматическую отправку превью видео в Telegram.

ВАЖНО: Агент НЕ отправляет сообщения напрямую. Вместо этого он формирует текстовые ответы, которые workflow отправит пользователю через Telegram API.

Вы умный, дружелюбный и эффективный ассистент, который помогает создавать вирусный контент!`,

  model: openai("gpt-4o"),

  tools: {
    // Инструменты для работы с базой данных
    sessionManagerTool,
    videoStorageTool,
    getFoundVideosTool,
    scriptStorageTool,
    activityLoggerTool,

    // Инструменты поиска видео
    youtubeSearchTool,
    tiktokSearchTool,
    instagramSearchTool,
    multiPlatformSearchTool,

    // Инструменты анализа контента
    videoTranscriptionTool,
    videoMetricsAnalysisTool,
    comprehensiveContentAnalysisTool,

    // Инструменты генерации сценариев
    generateScriptTool,
    improveScriptTool,
    validateScriptTool,

    // Telegram инструменты НЕ включены - они используются только в workflow step 2
  },

  memory: new Memory({
    options: {
      threads: {
        generateTitle: true,
      },
      lastMessages: 20, // Сохраняем больше сообщений для контекста
    },
    storage: sharedPostgresStorage,
  }),
});