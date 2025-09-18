import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";

// Инструмент для отправки простых текстовых сообщений в Telegram
export const sendTelegramMessageTool = createTool({
  id: "send-telegram-message-tool",
  description: "Отправляет текстовое сообщение в Telegram чат",
  inputSchema: z.object({
    chat_id: z.number().describe("ID чата Telegram"),
    message: z.string().describe("Текст сообщения для отправки"),
    parse_mode: z.enum(["HTML", "Markdown", "MarkdownV2"]).optional().describe("Режим парсинга текста"),
    disable_notification: z.boolean().default(false).describe("Отключить звуковое уведомление"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message_id: z.number().optional(),
    error_code: z.number().optional(),
    error_description: z.string().optional(),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [SendTelegramMessage] Starting execution with params:', context);
    
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        logger?.error('❌ [SendTelegramMessage] No TELEGRAM_BOT_TOKEN found');
        return {
          success: false,
          message: "TELEGRAM_BOT_TOKEN не настроен в переменных окружения"
        };
      }
      
      logger?.info('📝 [SendTelegramMessage] Sending message to Telegram...');
      
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const requestBody = {
        chat_id: context.chat_id,
        text: context.message,
        parse_mode: context.parse_mode,
        disable_notification: context.disable_notification,
      };
      
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.ok) {
        logger?.info('✅ [SendTelegramMessage] Message sent successfully:', { 
          message_id: responseData.result.message_id 
        });
        return {
          success: true,
          message_id: responseData.result.message_id,
          message: "Сообщение отправлено успешно"
        };
      } else {
        logger?.error('❌ [SendTelegramMessage] Telegram API error:', responseData);
        return {
          success: false,
          error_code: responseData.error_code,
          error_description: responseData.description,
          message: `Ошибка Telegram API: ${responseData.description || 'Unknown error'}`
        };
      }
      
    } catch (error) {
      logger?.error('❌ [SendTelegramMessage] Network or parsing error:', error);
      return {
        success: false,
        message: `Ошибка отправки сообщения: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Инструмент для отправки сообщений с кнопками (inline keyboard)
export const sendTelegramMessageWithButtonsTool = createTool({
  id: "send-telegram-message-with-buttons-tool",
  description: "Отправляет сообщение в Telegram с интерактивными кнопками",
  inputSchema: z.object({
    chat_id: z.number().describe("ID чата Telegram"),
    message: z.string().describe("Текст сообщения"),
    buttons: z.array(z.array(z.object({
      text: z.string().describe("Текст кнопки"),
      callback_data: z.string().describe("Данные для обратного вызова"),
    }))).describe("Массив рядов кнопок"),
    parse_mode: z.enum(["HTML", "Markdown", "MarkdownV2"]).optional().describe("Режим парсинга текста"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message_id: z.number().optional(),
    error_code: z.number().optional(),
    error_description: z.string().optional(),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [SendTelegramMessageWithButtons] Starting execution with params:', context);
    
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        logger?.error('❌ [SendTelegramMessageWithButtons] No TELEGRAM_BOT_TOKEN found');
        return {
          success: false,
          message: "TELEGRAM_BOT_TOKEN не настроен в переменных окружения"
        };
      }
      
      logger?.info('📝 [SendTelegramMessageWithButtons] Sending message with buttons to Telegram...');
      
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const requestBody = {
        chat_id: context.chat_id,
        text: context.message,
        parse_mode: context.parse_mode,
        reply_markup: {
          inline_keyboard: context.buttons
        }
      };
      
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.ok) {
        logger?.info('✅ [SendTelegramMessageWithButtons] Message with buttons sent successfully:', { 
          message_id: responseData.result.message_id,
          buttons_count: context.buttons.flat().length
        });
        return {
          success: true,
          message_id: responseData.result.message_id,
          message: "Сообщение с кнопками отправлено успешно"
        };
      } else {
        logger?.error('❌ [SendTelegramMessageWithButtons] Telegram API error:', responseData);
        return {
          success: false,
          error_code: responseData.error_code,
          error_description: responseData.description,
          message: `Ошибка Telegram API: ${responseData.description || 'Unknown error'}`
        };
      }
      
    } catch (error) {
      logger?.error('❌ [SendTelegramMessageWithButtons] Network or parsing error:', error);
      return {
        success: false,
        message: `Ошибка отправки сообщения с кнопками: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Инструмент для отправки статусных сообщений с эмодзи
export const sendStatusMessageTool = createTool({
  id: "send-status-message-tool",
  description: "Отправляет статусное сообщение с соответствующими эмодзи для информирования о прогрессе",
  inputSchema: z.object({
    chat_id: z.number().describe("ID чата Telegram"),
    status: z.enum([
      "search_started", "search_completed", "analysis_started", "analysis_completed",
      "script_generation_started", "script_generated", "script_improved",
      "video_generation_started", "video_completed", "published", "error", "cancelled"
    ]).describe("Статус процесса"),
    additional_info: z.string().optional().describe("Дополнительная информация"),
    topic: z.string().optional().describe("Тема для контекста"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message_id: z.number().optional(),
    status_message: z.string(),
    message: z.string(),
  }),
  execute: async ({ context, mastra, runtimeContext, tracingContext }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [SendStatusMessage] Starting execution with params:', context);
    
    try {
      // Создаем статусные сообщения с эмодзи
      const statusMessages = {
        search_started: `🔍 Ищу видео по теме "${context.topic || 'ваша тема'}"...`,
        search_completed: `✅ Поиск завершен! ${context.additional_info || 'Найдены популярные видео'}`,
        analysis_started: `📊 Анализирую контент...`,
        analysis_completed: `✅ Анализ завершен! ${context.additional_info || 'Выявлены тренды и паттерны'}`,
        script_generation_started: `✍️ Генерирую сценарий...`,
        script_generated: `🎬 Сценарий готов! ${context.additional_info || 'Основан на успешных паттернах'}`,
        script_improved: `🔧 Сценарий улучшен! ${context.additional_info || 'Внесены ваши правки'}`,
        video_generation_started: `🎬 Создаю видео...`,
        video_completed: `🎉 Видео готово! ${context.additional_info || 'Можно просмотреть и опубликовать'}`,
        published: `🚀 Опубликовано! ${context.additional_info || 'Видео размещено в социальных сетях'}`,
        error: `❌ Произошла ошибка. ${context.additional_info || 'Попробуйте еще раз'}`,
        cancelled: `⏹️ Операция отменена. ${context.additional_info || 'Можете начать заново'}`
      };
      
      const statusMessage = statusMessages[context.status];
      
      logger?.info('📝 [SendStatusMessage] Sending status message:', { status: context.status });
      
      // Используем базовый инструмент отправки сообщений
      const result = await sendTelegramMessageTool.execute({
        context: {
          chat_id: context.chat_id,
          message: statusMessage,
          parse_mode: "HTML",
          disable_notification: false,
        },
        mastra,
        runtimeContext,
        tracingContext,
      });
      
      if (result.success) {
        logger?.info('✅ [SendStatusMessage] Status message sent successfully');
        return {
          success: true,
          message_id: result.message_id,
          status_message: statusMessage,
          message: "Статусное сообщение отправлено успешно"
        };
      } else {
        return {
          success: false,
          status_message: statusMessage,
          message: result.message
        };
      }
      
    } catch (error) {
      logger?.error('❌ [SendStatusMessage] Error sending status message:', error);
      return {
        success: false,
        status_message: "",
        message: `Ошибка отправки статуса: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Инструмент для отправки сценария с кнопками действий
export const sendScriptWithActionsTool = createTool({
  id: "send-script-with-actions-tool",
  description: "Отправляет сгенерированный сценарий с кнопками для дальнейших действий",
  inputSchema: z.object({
    chat_id: z.number().describe("ID чата Telegram"),
    script_text: z.string().describe("Текст сценария"),
    estimated_duration: z.number().optional().describe("Примерная длительность в секундах"),
    show_improve_button: z.boolean().default(true).describe("Показать кнопку 'Переделать'"),
    show_video_button: z.boolean().default(true).describe("Показать кнопку 'Делать видео'"),
    show_cancel_button: z.boolean().default(true).describe("Показать кнопку 'Отмена'"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message_id: z.number().optional(),
    buttons_added: z.array(z.string()),
    message: z.string(),
  }),
  execute: async ({ context, mastra, runtimeContext, tracingContext }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [SendScriptWithActions] Starting execution with params:', context);
    
    try {
      // Формируем сообщение со сценарием
      const durationText = context.estimated_duration 
        ? `⏱️ Примерная длительность: ${context.estimated_duration} сек.\n\n`
        : "";
      
      const fullMessage = `🎬 <b>Сценарий готов!</b>\n\n${durationText}${context.script_text}\n\n💭 Что будем делать дальше?`;
      
      // Создаем кнопки действий
      const buttons = [];
      const buttonsAdded = [];
      
      if (context.show_improve_button) {
        buttons.push([{ text: "🔧 Переделать", callback_data: "improve_script" }]);
        buttonsAdded.push("Переделать");
      }
      
      if (context.show_video_button) {
        buttons.push([{ text: "🎬 Делать видео", callback_data: "create_video" }]);
        buttonsAdded.push("Делать видео");
      }
      
      if (context.show_cancel_button) {
        buttons.push([{ text: "❌ Отмена", callback_data: "cancel_session" }]);
        buttonsAdded.push("Отмена");
      }
      
      logger?.info('📝 [SendScriptWithActions] Sending script with action buttons...');
      
      // Отправляем сообщение с кнопками
      const result = await sendTelegramMessageWithButtonsTool.execute({
        context: {
          chat_id: context.chat_id,
          message: fullMessage,
          buttons: buttons,
          parse_mode: "HTML",
        },
        mastra,
        runtimeContext,
        tracingContext,
      });
      
      if (result.success) {
        logger?.info('✅ [SendScriptWithActions] Script with actions sent successfully');
        return {
          success: true,
          message_id: result.message_id,
          buttons_added: buttonsAdded,
          message: "Сценарий с кнопками действий отправлен успешно"
        };
      } else {
        return {
          success: false,
          buttons_added: [],
          message: result.message
        };
      }
      
    } catch (error) {
      logger?.error('❌ [SendScriptWithActions] Error sending script with actions:', error);
      return {
        success: false,
        buttons_added: [],
        message: `Ошибка отправки сценария: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Инструмент для отправки приветственного сообщения
export const sendWelcomeMessageTool = createTool({
  id: "send-welcome-message-tool",
  description: "Отправляет приветственное сообщение новому пользователю с описанием возможностей бота",
  inputSchema: z.object({
    chat_id: z.number().describe("ID чата Telegram"),
    user_name: z.string().optional().describe("Имя пользователя для персонализации"),
    is_returning_user: z.boolean().default(false).describe("Это возвращающийся пользователь"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message_id: z.number().optional(),
    message: z.string(),
  }),
  execute: async ({ context, mastra, runtimeContext, tracingContext }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [SendWelcomeMessage] Starting execution with params:', context);
    
    try {
      const userName = context.user_name ? `, ${context.user_name}` : "";
      
      let welcomeMessage;
      
      if (context.is_returning_user) {
        welcomeMessage = `👋 С возвращением${userName}!\n\n🎬 <b>Video Content Agent</b> готов создать новый вирусный контент!\n\n💡 Просто напишите тему, и я найду популярные видео, проанализирую тренды и создам оригинальный сценарий.\n\n🚀 <b>Напишите тему для нового видео!</b>`;
      } else {
        welcomeMessage = `🎉 Привет${userName}!\n\n🤖 Я <b>Video Content Agent</b> - ваш помощник в создании вирусного контента!\n\n<b>Что я умею:</b>\n🔍 Ищу популярные видео по вашей теме\n📊 Анализирую тренды и паттерны\n✍️ Генерирую оригинальные сценарии\n🎬 Создаю видео через HeyGen\n🚀 Публикую в социальных сетях\n\n💡 <b>Начнем?</b> Просто напишите тему для видео!\n\n<i>Например: "фитнес дома", "рецепты на завтрак", "лайфхаки для учебы"</i>`;
      }
      
      logger?.info('📝 [SendWelcomeMessage] Sending welcome message...');
      
      const result = await sendTelegramMessageTool.execute({
        context: {
          chat_id: context.chat_id,
          message: welcomeMessage,
          parse_mode: "HTML",
          disable_notification: false,
        },
        mastra,
        runtimeContext,
        tracingContext,
      });
      
      if (result.success) {
        logger?.info('✅ [SendWelcomeMessage] Welcome message sent successfully');
        return {
          success: true,
          message_id: result.message_id,
          message: "Приветственное сообщение отправлено успешно"
        };
      } else {
        return {
          success: false,
          message: result.message
        };
      }
      
    } catch (error) {
      logger?.error('❌ [SendWelcomeMessage] Error sending welcome message:', error);
      return {
        success: false,
        message: `Ошибка отправки приветствия: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});