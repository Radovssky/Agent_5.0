/**
 * Official TikTok API Search Tool
 * Uses TikTok for Developers API with stable 24-hour tokens
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { TikTokTokenManager, TikTokApiConfig } from "./tiktokTokenManager";

export interface OfficialTikTokVideo {
  id: string;
  title: string;
  video_description: string;
  duration: number;
  cover_image_url: string;
  embed_html: string;
  embed_link: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  create_time: number;
}

export interface TikTokSearchResponse {
  data: {
    videos: OfficialTikTokVideo[];
    cursor: number;
    has_more: boolean;
  };
  error?: {
    code: string;
    message: string;
    log_id: string;
  };
}

/**
 * Official TikTok Search using TikTok for Developers API
 */
export const createOfficialTikTokSearchTool = (tokenManager: TikTokTokenManager) => {
  return createTool({
    id: "official-tiktok-search-tool",
    description: "Поиск популярных видео в TikTok через официальный API с автоматическим управлением токенами",
    inputSchema: z.object({
      topic: z.string().describe("Тема для поиска видео"),
      max_results: z.number().default(3).describe("Максимальное количество результатов"),
      days_ago: z.number().default(10).describe("Искать видео не старше указанного количества дней"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      videos: z.array(z.object({
        video_id: z.string(),
        platform: z.string(),
        title: z.string(),
        description: z.string(),
        url: z.string(),
        thumbnail_url: z.string(),
        views: z.number(),
        likes: z.number(),
        comments: z.number(),
        duration: z.number(),
        published_at: z.string(),
      })),
      message: z.string(),
    }),
    execute: async ({ context, mastra }) => {
      const logger = mastra?.getLogger();
      logger?.info('🔍 [OfficialTikTokSearch] Starting search with official API:', context);

      try {
        // Получаем валидный токен (автоматически обновляется если нужно)
        const accessToken = await tokenManager.getValidToken();
        
        // Используем TikTok Research API для поиска видео
        const searchUrl = 'https://open.tiktokapis.com/v2/research/video/query/';
        
        // Формируем запрос для поиска
        const requestBody = {
          query: {
            and: [
              {
                operation: "IN",
                field_name: "keyword",
                field_values: [context.topic]
              }
            ]
          },
          max_count: Math.min(context.max_results, 100), // API лимит 100
          start_date: new Date(Date.now() - context.days_ago * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          fields: [
            "id",
            "title", 
            "video_description",
            "duration",
            "cover_image_url",
            "embed_html",
            "embed_link",
            "like_count",
            "comment_count", 
            "share_count",
            "view_count",
            "create_time"
          ]
        };

        logger?.info('📡 [OfficialTikTokSearch] Making API request to TikTok Research API');

        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger?.error('❌ [OfficialTikTokSearch] API request failed:', { 
            status: response.status, 
            error: errorText 
          });
          
          // Fallback message instead of throwing
          return {
            success: false,
            videos: [],
            message: `Ошибка официального TikTok API: ${response.status}. Проверьте настройки API ключей.`
          };
        }

        const searchResponse: TikTokSearchResponse = await response.json();
        
        if (searchResponse.error) {
          logger?.error('❌ [OfficialTikTokSearch] TikTok API error:', searchResponse.error);
          return {
            success: false,
            videos: [],
            message: `TikTok API ошибка: ${searchResponse.error.message}`
          };
        }

        // Обрабатываем найденные видео
        const videos = searchResponse.data.videos
          .sort((a, b) => b.view_count - a.view_count) // Сортируем по просмотрам
          .slice(0, context.max_results)
          .map(video => ({
            video_id: video.id,
            platform: "tiktok",
            title: video.title || `TikTok ${context.topic}`,
            description: video.video_description || `Видео о ${context.topic} в TikTok`,
            url: video.embed_link || `https://www.tiktok.com/search?q=${encodeURIComponent(context.topic)}`,
            thumbnail_url: video.cover_image_url || '',
            views: video.view_count || 0,
            likes: video.like_count || 0,
            comments: video.comment_count || 0,
            duration: video.duration || 30,
            published_at: new Date(video.create_time * 1000).toISOString(),
          }));

        logger?.info('✅ [OfficialTikTokSearch] Completed successfully', { 
          found: videos.length,
          total_available: searchResponse.data.videos.length 
        });

        return {
          success: true,
          videos: videos,
          message: `Найдено ${videos.length} видео в TikTok через официальный API по теме "${context.topic}"`
        };

      } catch (error) {
        logger?.error('❌ [OfficialTikTokSearch] Search error:', error);
        
        return {
          success: false,
          videos: [],
          message: `Ошибка официального TikTok API: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    },
  });
};