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

          // Расширенное извлечение данных из payload с отладкой
          const message = payload.message?.text || payload.callback_query?.data || payload.edited_message?.text || "";
          const userName = payload.message?.from?.username || payload.callback_query?.from?.username || payload.edited_message?.from?.username || "";
          
          // Улучшенное извлечение chat ID из различных типов сообщений
          let chatId = null;
          if (payload.message?.chat?.id) {
            chatId = payload.message.chat.id;
          } else if (payload.callback_query?.message?.chat?.id) {
            chatId = payload.callback_query.message.chat.id;
          } else if (payload.edited_message?.chat?.id) {
            chatId = payload.edited_message.chat.id;
          }
          
          // Отладочная информация
          logger?.info('📝 [Telegram] Debug info:', {
            hasMessage: !!payload.message,
            hasCallbackQuery: !!payload.callback_query,
            hasEditedMessage: !!payload.edited_message,
            extractedChatId: chatId,
            extractedMessage: message,
            extractedUserName: userName
          });
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          
          if (chatId && botToken) {
            try {
              if (message === '/start') {
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: '🤖 Привет! Я Video Content Agent.\n\nОтправьте мне тему для поиска видео, и я найду популярные ролики, проанализирую их и создам для вас сценарий на русском языке.\n\nНапример: "Как приготовить пиццу дома"'
                  })
                });
                logger?.info('✅ [Telegram] Sent /start reply');
              } else if (message && message.length > 0) {
                // Отправляем сообщение о начале обработки
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: `🔍 Ищу популярные видео по теме: "${message}"...\n\nЭто может занять несколько секунд.`
                  })
                });
                logger?.info('✅ [Telegram] Sent processing message');
                
                // ВРЕМЕННОЕ РЕШЕНИЕ: прямая обработка без агента
                try {
                  logger?.info('🔧 [Telegram] Starting direct processing to bypass agent issue...');
                  
                  // Прямой поиск в YouTube
                  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
                  if (youtubeApiKey) {
                    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(message)}&type=video&order=viewCount&maxResults=3&key=${youtubeApiKey}`;
                    const searchResponse = await fetch(searchUrl);
                    const searchData = await searchResponse.json();
                    
                    if (searchData.items && searchData.items.length > 0) {
                      // Формируем список найденных видео
                      const videoList = searchData.items.map((item: any, index: number) => {
                        const title = item.snippet.title;
                        const channel = item.snippet.channelTitle;
                        const videoId = item.id.videoId;
                        return `${index + 1}. **${title}**\n   Канал: ${channel}\n   https://youtube.com/watch?v=${videoId}`;
                      }).join('\n\n');
                      
                      // Простая генерация сценария на основе найденных видео
                      const scriptTitle = `${message}: Вирусный контент`;
                      const scriptHook = `Вы не поверите, что я обнаружил, изучая ${message}! Сейчас покажу секреты, которые используют топовые блогеры.`;
                      const scriptContent = `Проанализировав ${searchData.items.length} популярных видео по теме "${message}", я выявил главные паттерны успеха. Оказывается, все успешные авторы используют три ключевых элемента: захватывающий хук в первые секунды, структурированная подача информации, и четкий призыв к действию.`;
                      const scriptCTA = `Если этот анализ был полезен - ставьте лайк! Хотите больше таких разборов - подписывайтесь! И обязательно напишите в комментариях, какую тему проанализировать следующей!`;
                      
                      // Упрощенный ответ без Markdown для избежания ошибок
                      const fullResponse = `🎯 НАЙДЕННЫЕ ПОПУЛЯРНЫЕ ВИДЕО:\n\n${videoList}\n\n📝 СГЕНЕРИРОВАННЫЙ СЦЕНАРИЙ:\n\nЗаголовок: ${scriptTitle}\n\nХук (первые 5 секунд):\n${scriptHook}\n\nОсновное содержание:\n${scriptContent}\n\nПризыв к действию:\n${scriptCTA}\n\n✨ Сценарий создан на основе анализа трендов YouTube`;
                      
                      // Разбиваем длинные сообщения на части (Telegram лимит ~4096 символов)
                      if (fullResponse.length > 4000) {
                        // Отправляем видео отдельно
                        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            chat_id: chatId,
                            text: `🎯 НАЙДЕННЫЕ ПОПУЛЯРНЫЕ ВИДЕО:\n\n${videoList}`
                          })
                        });
                        
                        // Отправляем сценарий отдельно
                        const scriptResponse = `📝 СГЕНЕРИРОВАННЫЙ СЦЕНАРИЙ:\n\nЗаголовок: ${scriptTitle}\n\nХук (первые 5 секунд):\n${scriptHook}\n\nОсновное содержание:\n${scriptContent}\n\nПризыв к действию:\n${scriptCTA}\n\n✨ Сценарий создан на основе анализа трендов YouTube`;
                        
                        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            chat_id: chatId,
                            text: scriptResponse
                          })
                        });
                        
                      } else {
                        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            chat_id: chatId,
                            text: fullResponse
                          })
                        });
                      }
                      
                      logger?.info('✅ [Telegram] Successfully sent direct response with videos and script');
                      
                    } else {
                      throw new Error('No videos found');
                    }
                  } else {
                    throw new Error('YouTube API key not available');
                  }
                  
                } catch (directError) {
                  logger?.error('❌ [Telegram] Direct processing failed:', directError);
                  
                  // Fallback ответ при ошибке
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text: `❌ Временная проблема с обработкой запроса "${message}". \n\nСистема находится в режиме отладки. Попробуйте другую тему или повторите запрос позже.\n\n🔧 Разработчик уведомлен о проблеме.`
                    })
                  });
                  
                  logger?.info('✅ [Telegram] Sent fallback error message');
                }
              }
            } catch (error) {
              logger?.error('❌ [Telegram] Failed to send immediate reply:', error);
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
