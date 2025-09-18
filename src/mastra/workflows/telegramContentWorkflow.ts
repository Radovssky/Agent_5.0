import { createWorkflow, createStep } from "../inngest";
import { z } from "zod";
import { videoContentAgent } from "../agents/videoContentAgent";

// Шаг 1: Использование агента для обработки сообщения
const useAgentStep = createStep({
  id: "use-video-content-agent",
  description: "Обрабатывает сообщение пользователя через Video Content Agent",
  inputSchema: z.object({
    message: z.string().describe("JSON строка с данными сообщения Telegram"),
    threadId: z.string().describe("Уникальный ID треда для памяти агента"),
  }),
  outputSchema: z.object({
    response: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
    originalMessage: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [UseAgentStep] Starting agent processing with params:', inputData);
    
    try {
      // Парсим сообщение Telegram
      const telegramData = JSON.parse(inputData.message);
      const userMessage = telegramData?.message?.text || telegramData?.callback_query?.data || "";
      const telegramUserId = telegramData?.message?.from?.id || telegramData?.callback_query?.from?.id;
      const telegramChatId = telegramData?.message?.chat?.id || telegramData?.callback_query?.message?.chat?.id;
      const userName = telegramData?.message?.from?.first_name || telegramData?.callback_query?.from?.first_name;
      const username = telegramData?.message?.from?.username || telegramData?.callback_query?.from?.username;
      
      logger?.info('📝 [UseAgentStep] Extracted message data:', {
        userMessage,
        telegramUserId,
        telegramChatId,
        userName
      });
      
      // Формируем контекстное сообщение для агента
      const contextualMessage = `
TELEGRAM MESSAGE CONTEXT:
- User ID: ${telegramUserId}
- Chat ID: ${telegramChatId}
- User Name: ${userName}
- Username: ${username}
- User Message: "${userMessage}"

Пользователь написал: "${userMessage}"

Обработайте это сообщение согласно вашему алгоритму работы. Не забудьте:
1. Проверить/создать сессию пользователя
2. Определить тип сообщения (новая тема, команда кнопки, улучшение сценария)
3. Выполнить соответствующие действия
4. Отправить ответ пользователю

Telegram User ID: ${telegramUserId}
Telegram Chat ID: ${telegramChatId}
      `;
      
      logger?.info('📝 [UseAgentStep] Calling Video Content Agent...');
      
      // Вызываем агента для обработки сообщения
      const { text } = await videoContentAgent.generate([
        { role: "user", content: contextualMessage },
      ], {
        resourceId: "video-content-bot",
        threadId: inputData.threadId,
        maxSteps: 10, // Разрешаем агенту выполнить несколько шагов с инструментами
      });
      
      logger?.info('✅ [UseAgentStep] Agent processing completed successfully');
      return {
        response: text,
        success: true,
        originalMessage: inputData.message,
      };
      
    } catch (error) {
      logger?.error('❌ [UseAgentStep] Agent processing error:', error);
      return {
        response: `Произошла ошибка при обработке сообщения: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalMessage: inputData.message,
      };
    }
  },
});

// Шаг 2: Отправка ответа агента в Telegram
const sendReplyStep = createStep({
  id: "send-telegram-reply",
  description: "Отправляет ответ агента пользователю в Telegram",
  inputSchema: z.object({
    response: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
    originalMessage: z.string(),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    message_id: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [SendReplyStep] Sending agent response to Telegram:', {
      responseLength: inputData.response.length,
      success: inputData.success
    });
    
    try {
      // Парсим оригинальное сообщение чтобы получить chat_id
      const telegramData = JSON.parse(inputData.originalMessage);
      const chatId = telegramData?.message?.chat?.id || telegramData?.callback_query?.message?.chat?.id;
      
      if (!chatId) {
        logger?.error('❌ [SendReplyStep] No chat_id found in message');
        return {
          sent: false,
          error: "Chat ID not found"
        };
      }
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        logger?.error('❌ [SendReplyStep] No TELEGRAM_BOT_TOKEN found');
        return {
          sent: false,
          error: "TELEGRAM_BOT_TOKEN not configured"
        };
      }
      
      // Подготавливаем сообщение для отправки
      let messageToSend = inputData.response;
      if (!inputData.success && inputData.error) {
        messageToSend = `❌ Произошла ошибка: ${inputData.error}`;
      }
      
      logger?.info('📝 [SendReplyStep] Sending message via Telegram API...', {
        chatId,
        messageLength: messageToSend.length
      });
      
      // Отправляем сообщение через Telegram API
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageToSend,
          parse_mode: "HTML",
        }),
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.ok) {
        logger?.info('✅ [SendReplyStep] Message sent successfully to Telegram:', { 
          message_id: responseData.result.message_id,
          chat_id: chatId
        });
        return {
          sent: true,
          message_id: responseData.result.message_id,
        };
      } else {
        logger?.error('❌ [SendReplyStep] Telegram API error:', responseData);
        return {
          sent: false,
          error: `Telegram API error: ${responseData.description || 'Unknown error'}`
        };
      }
      
    } catch (error) {
      logger?.error('❌ [SendReplyStep] Error sending reply:', error);
      return {
        sent: false,
        error: `Failed to send reply: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Основной workflow
export const telegramContentWorkflow = createWorkflow({
  id: "telegram-content-workflow",
  description: "Обрабатывает сообщения Telegram через Video Content Agent",
  inputSchema: z.object({
    message: z.string().describe("JSON строка с данными сообщения Telegram"),
    threadId: z.string().describe("Уникальный ID треда для памяти агента"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    response: z.string(),
    sent: z.boolean(),
    message_id: z.number().optional(),
    error: z.string().optional(),
  }),
})
  .then(useAgentStep)
  .then(sendReplyStep)
  .commit();