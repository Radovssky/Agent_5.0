import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";
import { Pool } from 'pg';

// Создаем инструменты для работы с базой данных
const getDbConnection = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
};

// Инструмент для управления пользовательскими сессиями
export const sessionManagerTool = createTool({
  id: "session-manager-tool",
  description: "Управляет пользовательскими сессиями: создание, получение, обновление статуса",
  inputSchema: z.object({
    action: z.enum(["create", "get", "update_status", "close"]).describe("Действие с сессией"),
    telegram_user_id: z.number().describe("ID пользователя Telegram"),
    telegram_chat_id: z.number().optional().describe("ID чата Telegram"),
    topic: z.string().optional().describe("Тема для создания новой сессии"),
    session_id: z.string().optional().describe("ID сессии для обновления"),
    status: z.enum(["active", "completed", "cancelled"]).optional().describe("Новый статус сессии"),
    current_step: z.string().optional().describe("Текущий шаг обработки"),
    username: z.string().optional().describe("Имя пользователя"),
    first_name: z.string().optional().describe("Имя пользователя"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    session: z.object({
      id: z.string(),
      telegram_user_id: z.number(),
      topic: z.string(),
      status: z.string(),
      current_step: z.string(),
    }).optional(),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [SessionManager] Starting execution with params:', context);
    
    const pool = getDbConnection();
    const client = await pool.connect();
    
    try {
      switch (context.action) {
        case "get":
          logger?.info('📝 [SessionManager] Getting active session for user...');
          const getUserResult = await client.query(
            'SELECT * FROM user_sessions WHERE telegram_user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
            [context.telegram_user_id, 'active']
          );
          
          if (getUserResult.rows.length > 0) {
            const session = getUserResult.rows[0];
            logger?.info('✅ [SessionManager] Found active session:', { session_id: session.id });
            return {
              success: true,
              session: {
                id: session.id,
                telegram_user_id: session.telegram_user_id,
                topic: session.topic,
                status: session.status,
                current_step: session.current_step,
              },
              message: "Активная сессия найдена"
            };
          } else {
            logger?.info('📝 [SessionManager] No active session found');
            return {
              success: false,
              message: "Активная сессия не найдена"
            };
          }
          
        case "create":
          logger?.info('📝 [SessionManager] Creating new session...');
          if (!context.topic || !context.telegram_chat_id) {
            return { success: false, message: "Для создания сессии нужна тема и chat_id" };
          }
          
          const createResult = await client.query(
            `INSERT INTO user_sessions (telegram_user_id, telegram_chat_id, username, first_name, topic, status, current_step) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [context.telegram_user_id, context.telegram_chat_id, context.username, context.first_name, context.topic, 'active', 'topic_input']
          );
          
          const newSession = createResult.rows[0];
          logger?.info('✅ [SessionManager] Created new session:', { session_id: newSession.id });
          return {
            success: true,
            session: {
              id: newSession.id,
              telegram_user_id: newSession.telegram_user_id,
              topic: newSession.topic,
              status: newSession.status,
              current_step: newSession.current_step,
            },
            message: "Новая сессия создана"
          };
          
        case "update_status":
          logger?.info('📝 [SessionManager] Updating session status...');
          if (!context.session_id) {
            return { success: false, message: "Для обновления нужен session_id" };
          }
          
          const updateFields = [];
          const updateValues = [];
          let paramIndex = 1;
          
          if (context.status) {
            updateFields.push(`status = $${paramIndex++}`);
            updateValues.push(context.status);
          }
          if (context.current_step) {
            updateFields.push(`current_step = $${paramIndex++}`);
            updateValues.push(context.current_step);
          }
          
          updateValues.push(context.session_id);
          
          const updateResult = await client.query(
            `UPDATE user_sessions SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            updateValues
          );
          
          if (updateResult.rows.length > 0) {
            const updatedSession = updateResult.rows[0];
            logger?.info('✅ [SessionManager] Updated session:', { session_id: updatedSession.id });
            return {
              success: true,
              session: {
                id: updatedSession.id,
                telegram_user_id: updatedSession.telegram_user_id,
                topic: updatedSession.topic,
                status: updatedSession.status,
                current_step: updatedSession.current_step,
              },
              message: "Сессия обновлена"
            };
          } else {
            return { success: false, message: "Сессия не найдена" };
          }
          
        case "close":
          logger?.info('📝 [SessionManager] Closing active sessions...');
          const closeResult = await client.query(
            'UPDATE user_sessions SET status = $1 WHERE telegram_user_id = $2 AND status = $3 RETURNING *',
            ['completed', context.telegram_user_id, 'active']
          );
          
          logger?.info('✅ [SessionManager] Closed sessions:', { count: closeResult.rows.length });
          return {
            success: true,
            message: `Закрыто активных сессий: ${closeResult.rows.length}`
          };
          
        default:
          return { success: false, message: "Неизвестное действие" };
      }
    } catch (error) {
      logger?.error('❌ [SessionManager] Database error:', error);
      return { 
        success: false, 
        message: `Ошибка базы данных: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    } finally {
      client.release();
      await pool.end();
    }
  },
});

// Инструмент для сохранения найденных видео
export const videoStorageTool = createTool({
  id: "video-storage-tool",
  description: "Сохраняет найденные видео в базе данных с метриками и анализом",
  inputSchema: z.object({
    session_id: z.string().describe("ID сессии"),
    videos: z.array(z.object({
      video_id: z.string().describe("ID видео"),
      platform: z.string().describe("Платформа (youtube, tiktok, instagram)"),
      title: z.string().optional().describe("Заголовок видео"),
      description: z.string().optional().describe("Описание видео"),
      url: z.string().describe("Ссылка на видео"),
      thumbnail_url: z.string().optional().describe("Ссылка на превью"),
      views: z.number().default(0).describe("Количество просмотров"),
      likes: z.number().default(0).describe("Количество лайков"),
      comments: z.number().default(0).describe("Количество комментариев"),
      duration: z.number().optional().describe("Длительность в секундах"),
      published_at: z.string().optional().describe("Дата публикации"),
      transcript: z.string().optional().describe("Транскрипт"),
      transcript_ru: z.string().optional().describe("Русский перевод транскрипта"),
      keywords: z.array(z.string()).default([]).describe("Ключевые слова"),
    })).describe("Массив найденных видео"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    saved_count: z.number(),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [VideoStorage] Starting execution with params:', context);
    
    const pool = getDbConnection();
    const client = await pool.connect();
    
    try {
      let saved_count = 0;
      
      for (const video of context.videos) {
        logger?.info('📝 [VideoStorage] Saving video:', { video_id: video.video_id, platform: video.platform });
        
        const published_at = video.published_at ? new Date(video.published_at) : null;
        
        await client.query(
          `INSERT INTO found_videos (
            session_id, video_id, platform, title, description, url, thumbnail_url,
            views, likes, comments, duration, published_at, transcript, transcript_ru, keywords
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (session_id, video_id, platform) DO UPDATE SET
            views = EXCLUDED.views,
            likes = EXCLUDED.likes,
            comments = EXCLUDED.comments`,
          [
            context.session_id,
            video.video_id,
            video.platform,
            video.title,
            video.description,
            video.url,
            video.thumbnail_url,
            video.views,
            video.likes,
            video.comments,
            video.duration,
            published_at,
            video.transcript,
            video.transcript_ru,
            video.keywords
          ]
        );
        
        saved_count++;
      }
      
      logger?.info('✅ [VideoStorage] Completed successfully, saved videos:', { count: saved_count });
      return {
        success: true,
        saved_count,
        message: `Сохранено видео: ${saved_count}`
      };
      
    } catch (error) {
      logger?.error('❌ [VideoStorage] Database error:', error);
      return { 
        success: false, 
        saved_count: 0,
        message: `Ошибка сохранения видео: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    } finally {
      client.release();
      await pool.end();
    }
  },
});

// Инструмент для получения найденных видео
export const getFoundVideosTool = createTool({
  id: "get-found-videos-tool", 
  description: "Получает найденные видео по сессии для анализа и генерации сценария",
  inputSchema: z.object({
    session_id: z.string().describe("ID сессии"),
    viral_only: z.boolean().default(false).describe("Получить только вирусные видео"),
    limit: z.number().default(15).describe("Максимальное количество видео"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    videos: z.array(z.object({
      id: z.string(),
      video_id: z.string(),
      platform: z.string(),
      title: z.string().nullable(),
      description: z.string().nullable(),
      url: z.string(),
      views: z.number(),
      likes: z.number(),
      comments: z.number(),
      duration: z.number().nullable(),
      transcript: z.string().nullable(),
      transcript_ru: z.string().nullable(),
      keywords: z.array(z.string()),
      engagement_score: z.number().nullable(),
      is_viral: z.boolean(),
    })),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [GetFoundVideos] Starting execution with params:', context);
    
    const pool = getDbConnection();
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT id, video_id, platform, title, description, url, views, likes, comments, 
               duration, transcript, transcript_ru, keywords, engagement_score, is_viral
        FROM found_videos 
        WHERE session_id = $1
      `;
      const params = [context.session_id];
      
      if (context.viral_only) {
        query += ` AND is_viral = true`;
      }
      
      query += ` ORDER BY engagement_score DESC NULLS LAST, views DESC LIMIT $2`;
      params.push(context.limit.toString());
      
      logger?.info('📝 [GetFoundVideos] Executing query...');
      const result = await client.query(query, params);
      
      const videos = result.rows.map((row: any) => ({
        id: row.id,
        video_id: row.video_id,
        platform: row.platform,
        title: row.title,
        description: row.description,
        url: row.url,
        views: row.views,
        likes: row.likes,
        comments: row.comments,
        duration: row.duration,
        transcript: row.transcript,
        transcript_ru: row.transcript_ru,
        keywords: row.keywords || [],
        engagement_score: row.engagement_score,
        is_viral: row.is_viral,
      }));
      
      logger?.info('✅ [GetFoundVideos] Completed successfully, found videos:', { count: videos.length });
      return {
        success: true,
        videos,
        message: `Найдено видео: ${videos.length}`
      };
      
    } catch (error) {
      logger?.error('❌ [GetFoundVideos] Database error:', error);
      return { 
        success: false, 
        videos: [],
        message: `Ошибка получения видео: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    } finally {
      client.release();
      await pool.end();
    }
  },
});

// Инструмент для сохранения сгенерированных сценариев
export const scriptStorageTool = createTool({
  id: "script-storage-tool",
  description: "Сохраняет и обновляет сгенерированные сценарии в базе данных",
  inputSchema: z.object({
    action: z.enum(["save", "update", "get"]).describe("Действие со сценарием"),
    session_id: z.string().describe("ID сессии"),
    script_text: z.string().optional().describe("Текст сценария"),
    script_status: z.enum(["draft", "approved", "rejected"]).optional().describe("Статус сценария"),
    improvement_notes: z.string().optional().describe("Заметки по улучшению от пользователя"),
    script_version: z.number().optional().describe("Версия сценария"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    script: z.object({
      id: z.string(),
      script_text: z.string().nullable(),
      script_status: z.string(),
      script_version: z.number(),
      improvement_notes: z.string().nullable(),
    }).optional(),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [ScriptStorage] Starting execution with params:', context);
    
    const pool = getDbConnection();
    const client = await pool.connect();
    
    try {
      switch (context.action) {
        case "save":
          logger?.info('📝 [ScriptStorage] Saving new script...');
          if (!context.script_text) {
            return { success: false, message: "Для сохранения нужен текст сценария" };
          }
          
          const saveResult = await client.query(
            `INSERT INTO generated_content (session_id, script_text, script_status, script_version) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [context.session_id, context.script_text, context.script_status || 'draft', 1]
          );
          
          const newScript = saveResult.rows[0];
          logger?.info('✅ [ScriptStorage] Saved new script:', { script_id: newScript.id });
          return {
            success: true,
            script: {
              id: newScript.id,
              script_text: newScript.script_text,
              script_status: newScript.script_status,
              script_version: newScript.script_version,
              improvement_notes: newScript.improvement_notes,
            },
            message: "Сценарий сохранен"
          };
          
        case "update":
          logger?.info('📝 [ScriptStorage] Updating script...');
          
          // Найти последний сценарий для сессии
          const findResult = await client.query(
            'SELECT * FROM generated_content WHERE session_id = $1 ORDER BY script_version DESC LIMIT 1',
            [context.session_id]
          );
          
          if (findResult.rows.length === 0) {
            return { success: false, message: "Сценарий для обновления не найден" };
          }
          
          const currentScript = findResult.rows[0];
          const newVersion = currentScript.script_version + 1;
          
          // Создать новую версию сценария
          const updateResult = await client.query(
            `INSERT INTO generated_content (session_id, script_text, script_status, script_version, improvement_notes) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
              context.session_id, 
              context.script_text || currentScript.script_text, 
              context.script_status || 'draft', 
              newVersion,
              context.improvement_notes
            ]
          );
          
          const updatedScript = updateResult.rows[0];
          logger?.info('✅ [ScriptStorage] Updated script:', { script_id: updatedScript.id, version: newVersion });
          return {
            success: true,
            script: {
              id: updatedScript.id,
              script_text: updatedScript.script_text,
              script_status: updatedScript.script_status,
              script_version: updatedScript.script_version,
              improvement_notes: updatedScript.improvement_notes,
            },
            message: `Сценарий обновлен (версия ${newVersion})`
          };
          
        case "get":
          logger?.info('📝 [ScriptStorage] Getting latest script...');
          const getResult = await client.query(
            'SELECT * FROM generated_content WHERE session_id = $1 ORDER BY script_version DESC LIMIT 1',
            [context.session_id]
          );
          
          if (getResult.rows.length > 0) {
            const script = getResult.rows[0];
            logger?.info('✅ [ScriptStorage] Found script:', { script_id: script.id });
            return {
              success: true,
              script: {
                id: script.id,
                script_text: script.script_text,
                script_status: script.script_status,
                script_version: script.script_version,
                improvement_notes: script.improvement_notes,
              },
              message: "Сценарий найден"
            };
          } else {
            return { success: false, message: "Сценарий не найден" };
          }
          
        default:
          return { success: false, message: "Неизвестное действие" };
      }
    } catch (error) {
      logger?.error('❌ [ScriptStorage] Database error:', error);
      return { 
        success: false, 
        message: `Ошибка работы со сценарием: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    } finally {
      client.release();
      await pool.end();
    }
  },
});

// Инструмент для логирования активности
export const activityLoggerTool = createTool({
  id: "activity-logger-tool",
  description: "Логирует важные события и действия пользователей в системе",
  inputSchema: z.object({
    session_id: z.string().optional().describe("ID сессии"),
    telegram_user_id: z.number().describe("ID пользователя Telegram"),
    action: z.string().describe("Название действия (search_started, videos_found, script_generated, etc.)"),
    message: z.string().optional().describe("Сообщение о событии"),
    data: z.record(z.string(), z.any()).default({}).describe("Дополнительные данные события"),
    status: z.enum(["success", "error", "warning"]).default("success").describe("Статус события"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    log_id: z.string().optional(),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [ActivityLogger] Starting execution with params:', context);
    
    const pool = getDbConnection();
    const client = await pool.connect();
    
    try {
      logger?.info('📝 [ActivityLogger] Saving activity log...');
      const result = await client.query(
        `INSERT INTO activity_logs (session_id, telegram_user_id, action, message, data, status) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          context.session_id,
          context.telegram_user_id,
          context.action,
          context.message,
          JSON.stringify(context.data),
          context.status
        ]
      );
      
      const logId = result.rows[0].id;
      logger?.info('✅ [ActivityLogger] Activity logged successfully:', { log_id: logId });
      return {
        success: true,
        log_id: logId,
        message: "Событие записано в лог"
      };
      
    } catch (error) {
      logger?.error('❌ [ActivityLogger] Database error:', error);
      return { 
        success: false, 
        message: `Ошибка логирования: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    } finally {
      client.release();
      await pool.end();
    }
  },
});