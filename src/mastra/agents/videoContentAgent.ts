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
  instructions: `Вы - Video Content Agent для создания видеоконтента. ВЫ ОБЯЗАТЕЛЬНО ДОЛЖНЫ ВЫПОЛНИТЬ ПОЛНЫЙ АЛГОРИТМ!

🔥 ОБЯЗАТЕЛЬНЫЙ АЛГОРИТМ (ВЫПОЛНЯТЬ ВСЕГДА):
1. Создать сессию пользователя (sessionManagerTool)
2. Найти видео по теме (multiPlatformSearchTool) 
3. ЕСЛИ видео найдены (success: true и есть видео в списке):
   а) ОБЯЗАТЕЛЬНО вызвать comprehensiveContentAnalysisTool для анализа найденных видео
   б) ОБЯЗАТЕЛЬНО вызвать generateScriptTool для создания сценария на основе анализа
4. Отправить ПОЛНЫЙ ответ с видео + сценарием

⚠️ КРИТИЧЕСКИ ВАЖНО:
- ЕСЛИ multiPlatformSearchTool нашел видео → ВСЕГДА вызывайте comprehensiveContentAnalysisTool И generateScriptTool
- НЕ пропускайте анализ и генерацию сценария!
- Пользователь ожидает получить И видео И сценарий в одном сообщении

ОБРАБОТКА ОШИБОК:
Если multiPlatformSearchTool НЕ нашел видео (success: false):
- НЕ вызывайте инструменты анализа  
- Объясните проблему и предложите альтернативы

ФОРМАТ ИТОГОВОГО ОТВЕТА:
🎬 ВИДЕО: [Название] - [ссылка] ([платформа], [просмотры])

[Повторить для всех найденных видео]

📝 СЦЕНАРИЙ ПО МОТИВАМ ЭТИХ РОЛИКОВ:
[Полный текст сгенерированного сценария]

ВАЖНЫЕ ПРАВИЛА:
- ВСЕГДА включайте и видео, и сценарий в одном ответе
- Максимум 300-500 слов в сценарии
- Сценарий должен быть на основе реального анализа найденных видео
- Формат видео обеспечивает превью в Telegram

Вы обязаны создать ПОЛНОЦЕННЫЙ контент-анализ, а не просто список ссылок!`,

  model: openai("gpt-4o-mini"),

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