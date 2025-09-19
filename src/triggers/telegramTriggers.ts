import type { ContentfulStatusCode } from "hono/utils/http-status";

import { registerApiRoute } from "../mastra/inngest";
import { Mastra } from "@mastra/core";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn(
    "Trying to initialize Telegram triggers without TELEGRAM_BOT_TOKEN. Can you confirm that the Telegram integration is configured correctly?",
  );
}

export type TriggerInfoTelegramOnNewMessage = {
  type: "telegram/message";
  params: {
    userName: string;
    message: string;
  };
  payload: any;
};

export function registerTelegramTrigger({
  triggerType,
  handler,
}: {
  triggerType: string;
  handler: (
    mastra: Mastra,
    triggerInfo: TriggerInfoTelegramOnNewMessage,
  ) => Promise<void>;
}) {
  return [
    registerApiRoute("/webhooks/telegram/action", {
      method: "POST",
      handler: async (c) => {
        const mastra = c.get("mastra");
        const logger = mastra.getLogger();
        try {
          const payload = await c.req.json();

          logger?.info("📝 [Telegram] payload", payload);

          // Безопасное извлечение данных из payload
          const message = payload.message?.text || payload.callback_query?.data || "";
          const userName = payload.message?.from?.username || payload.callback_query?.from?.username || "";
          
          // Отправляем немедленный ответ пользователю через Telegram API
          const chatId = payload.message?.chat?.id || payload.callback_query?.message?.chat?.id;
          if (chatId && message === '/start') {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (botToken) {
              try {
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: '🤖 Привет! Я Video Content Agent.\n\nОтправьте мне тему для поиска видео, и я найду популярные ролики, проанализирую их и создам для вас сценарий на русском языке.\n\nНапример: "Как приготовить пиццу дома"'
                  })
                });
                logger?.info('✅ [Telegram] Sent immediate reply to user');
              } catch (error) {
                logger?.error('❌ [Telegram] Failed to send immediate reply:', error);
              }
            }
          }

          // Запускаем workflow в фоне (не блокируем ответ)
          handler(mastra, {
            type: triggerType,
            params: {
              userName,
              message,
            },
            payload,
          } as TriggerInfoTelegramOnNewMessage).catch(error => {
            logger?.error('❌ [Telegram] Workflow failed:', error);
          });

          return c.text("OK", 200);
        } catch (error) {
          logger?.error("Error handling Telegram webhook:", error);
          return c.text("Internal Server Error", 500);
        }
      },
    }),
  ];
}
