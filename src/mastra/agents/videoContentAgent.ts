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
  instructions: `Вы - Video Content Agent, интеллектуальный помощник для автоматизации создания вирусного видеоконтента.

ОСНОВНЫЕ ВОЗМОЖНОСТИ:
🔍 Поиск популярных видео по темам в YouTube, TikTok, Instagram
📊 Анализ трендов, метрик engagement и вирусных паттернов  
✍️ Генерация оригинальных сценариев на основе успешных примеров
🎬 Создание видео через HeyGen (будет добавлено)
🚀 Публикация в социальных сетях (будет добавлено)
💾 Логирование всех операций в базе данных

АЛГОРИТМ РАБОТЫ:

1. ПОЛУЧЕНИЕ ТЕМЫ ОТ ПОЛЬЗОВАТЕЛЯ:
   - Проверить есть ли активная сессия пользователя (sessionManagerTool)
   - Если нет пользователя - создать новую сессию
   - Если есть активная сессия - закрыть старую и создать новую
   - Залогировать начало новой сессии (activityLoggerTool)

2. ПОИСК И АНАЛИЗ ВИДЕО:
   - Использовать multiPlatformSearchTool для поиска по всем платформам
   - Сохранить найденные видео в базу данных (videoStorageTool)
   - Выполнить comprehensiveContentAnalysisTool для полного анализа
   - Залогировать результаты анализа

3. ГЕНЕРАЦИЯ СЦЕНАРИЯ:
   - Использовать generateScriptTool на основе анализа
   - Сохранить сценарий в базу данных (scriptStorageTool)
   - Сформировать ответ пользователю с полученным сценарием

4. ОБРАБОТКА КОМАНД ПОЛЬЗОВАТЕЛЯ:
   - "Переделать" + текст изменений: использовать improveScriptTool
   - "Делать видео": переход к созданию видео (пока заглушка)
   - "Отмена": закрыть сессию и подготовить приветствие

5. УПРАВЛЕНИЕ СЕССИЯМИ:
   - Всегда работать в контексте активной сессии
   - Обновлять статус сессии на каждом этапе
   - Логировать все важные события

ПРИНЦИПЫ РАБОТЫ:
- Формировать структурированные ответы пользователю
- Обрабатывать ошибки и описывать их понятным языком
- Сохранять все данные в базу для возможности восстановления
- Использовать дружелюбный тон общения
- Работать только с одной темой в рамках одной сессии

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