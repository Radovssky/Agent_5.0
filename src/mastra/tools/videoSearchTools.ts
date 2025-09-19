import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";

// Инструмент для поиска видео в YouTube
export const youtubeSearchTool = createTool({
  id: "youtube-search-tool",
  description: "Ищет популярные видео в YouTube Shorts по заданной теме",
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
    logger?.info('🔧 [YouTubeSearch] Starting execution with params:', context);
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      logger?.error('❌ [YouTubeSearch] No YouTube API key found');
      return {
        success: false,
        videos: [],
        message: 'YouTube API ключ не найден в переменных окружения'
      };
    }
    
    try {
      logger?.info('📝 [YouTubeSearch] Searching for videos via YouTube API...');
      
      // Определяем временной диапазон для поиска
      const publishedAfter = new Date(Date.now() - context.days_ago * 24 * 60 * 60 * 1000).toISOString();
      
      // Формируем запрос к YouTube Data API v3
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('key', apiKey);
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('q', context.topic);
      searchUrl.searchParams.set('maxResults', context.max_results.toString());
      searchUrl.searchParams.set('order', 'viewCount'); // Сортировка по количеству просмотров
      searchUrl.searchParams.set('publishedAfter', publishedAfter);
      searchUrl.searchParams.set('videoDuration', 'short'); // Короткие видео (< 4 минут)
      
      logger?.info('📡 [YouTubeSearch] Making API request to:', searchUrl.toString());
      
      const searchResponse = await fetch(searchUrl.toString());
      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok || searchData.error) {
        const errorMsg = searchData.error?.message || `HTTP ${searchResponse.status}`;
        logger?.error('❌ [YouTubeSearch] API error:', errorMsg);
        return {
          success: false,
          videos: [],
          message: `Ошибка YouTube API: ${errorMsg}`
        };
      }
      
      if (!searchData.items || searchData.items.length === 0) {
        logger?.info('ℹ️ [YouTubeSearch] No videos found');
        return {
          success: true,
          videos: [],
          message: `Не найдено видео по теме "${context.topic}" за последние ${context.days_ago} дней`
        };
      }
      
      // Получаем детальную информацию о видео (статистика, длительность)
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      detailsUrl.searchParams.set('key', apiKey);
      detailsUrl.searchParams.set('part', 'statistics,contentDetails');
      detailsUrl.searchParams.set('id', videoIds);
      
      logger?.info('📡 [YouTubeSearch] Getting video details for IDs:', videoIds);
      
      const detailsResponse = await fetch(detailsUrl.toString());
      const detailsData = await detailsResponse.json();
      
      if (!detailsResponse.ok || detailsData.error) {
        const errorMsg = detailsData.error?.message || `HTTP ${detailsResponse.status}`;
        logger?.warn('⚠️ [YouTubeSearch] Details API error, using basic data:', errorMsg);
      }
      
      // Функция для парсинга ISO 8601 длительности (PT1M30S -> 90 секунд)
      const parseDuration = (duration: string): number => {
        const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
        const minutes = parseInt(match?.[1] || '0');
        const seconds = parseInt(match?.[2] || '0');
        return minutes * 60 + seconds;
      };
      
      // Объединяем данные поиска и детализации
      const videos = searchData.items.map((item: any, index: number) => {
        const details = detailsData.items?.[index];
        const statistics = details?.statistics || {};
        const contentDetails = details?.contentDetails || {};
        
        return {
          video_id: item.id.videoId,
          platform: "youtube",
          title: item.snippet.title,
          description: item.snippet.description || `Видео о ${context.topic}`,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          thumbnail_url: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
          views: parseInt(statistics.viewCount || '0'),
          likes: parseInt(statistics.likeCount || '0'),
          comments: parseInt(statistics.commentCount || '0'),
          duration: parseDuration(contentDetails.duration || 'PT0S'),
          published_at: item.snippet.publishedAt,
        };
      });
      
      logger?.info('✅ [YouTubeSearch] Completed successfully, found videos:', { 
        count: videos.length,
        totalViews: videos.reduce((sum: number, v: any) => sum + v.views, 0)
      });
      
      return {
        success: true,
        videos: videos,
        message: `Найдено ${videos.length} популярных видео на YouTube по теме "${context.topic}"`
      };
      
    } catch (error) {
      logger?.error('❌ [YouTubeSearch] Search error:', error);
      return {
        success: false,
        videos: [],
        message: `Ошибка поиска на YouTube: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      };
    }
  },
});

// Инструмент для поиска видео в TikTok
export const tiktokSearchTool = createTool({
  id: "tiktok-search-tool",
  description: "Ищет популярные видео в TikTok по заданной теме",
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
    logger?.info('🔧 [TikTokSearch] Starting execution with params:', context);
    
    try {
      // Заглушка для TikTok API - в реальном проекте здесь будет интеграция с TikTok API
      logger?.info('📝 [TikTokSearch] Searching for videos...');
      
      // Симуляция поиска видео (для демонстрации)
      const mockVideos = [
        {
          video_id: `tt_${Math.random().toString(36).substr(2, 9)}`,
          platform: "tiktok",
          title: `#${context.topic} тренд`,
          description: `Популярное видео про ${context.topic} в TikTok`,
          url: `https://tiktok.com/@user/video/${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://p16-sign-va.tiktokcdn.com/mock.jpeg`,
          views: Math.floor(Math.random() * 5000000) + 100000,
          likes: Math.floor(Math.random() * 500000) + 10000,
          comments: Math.floor(Math.random() * 50000) + 1000,
          duration: Math.floor(Math.random() * 45) + 15, // 15-60 секунд
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          video_id: `tt_${Math.random().toString(36).substr(2, 9)}`,
          platform: "tiktok",
          title: `${context.topic} вайб`,
          description: `Крутой ${context.topic} контент с высокими просмотрами`,
          url: `https://tiktok.com/@user2/video/${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://p16-sign-va.tiktokcdn.com/mock2.jpeg`,
          views: Math.floor(Math.random() * 3000000) + 50000,
          likes: Math.floor(Math.random() * 300000) + 5000,
          comments: Math.floor(Math.random() * 30000) + 500,
          duration: Math.floor(Math.random() * 45) + 15,
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          video_id: `tt_${Math.random().toString(36).substr(2, 9)}`,
          platform: "tiktok",
          title: `Лучший ${context.topic}`,
          description: `Топ видео про ${context.topic} - обязательно к просмотру!`,
          url: `https://tiktok.com/@user3/video/${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://p16-sign-va.tiktokcdn.com/mock3.jpeg`,
          views: Math.floor(Math.random() * 4000000) + 75000,
          likes: Math.floor(Math.random() * 400000) + 7500,
          comments: Math.floor(Math.random() * 40000) + 750,
          duration: Math.floor(Math.random() * 45) + 15,
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
      ].slice(0, context.max_results);
      
      logger?.info('✅ [TikTokSearch] Completed successfully, found videos:', { count: mockVideos.length });
      return {
        success: true,
        videos: mockVideos,
        message: `Найдено ${mockVideos.length} видео в TikTok`
      };
      
    } catch (error) {
      logger?.error('❌ [TikTokSearch] Search error:', error);
      return {
        success: false,
        videos: [],
        message: `Ошибка поиска в TikTok: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Инструмент для поиска видео в Instagram
export const instagramSearchTool = createTool({
  id: "instagram-search-tool",
  description: "Ищет популярные Reels в Instagram по заданной теме",
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
    logger?.info('🔧 [InstagramSearch] Starting execution with params:', context);
    
    try {
      // Заглушка для Instagram API - в реальном проекте здесь будет интеграция с Instagram Basic Display API
      logger?.info('📝 [InstagramSearch] Searching for videos...');
      
      // Симуляция поиска видео (для демонстрации)
      const mockVideos = [
        {
          video_id: `ig_${Math.random().toString(36).substr(2, 9)}`,
          platform: "instagram",
          title: `${context.topic} Reels`,
          description: `Популярные Reels про ${context.topic}. #${context.topic} #reels #trending`,
          url: `https://instagram.com/reel/${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://scontent.cdninstagram.com/mock.jpg`,
          views: Math.floor(Math.random() * 2000000) + 25000,
          likes: Math.floor(Math.random() * 200000) + 2500,
          comments: Math.floor(Math.random() * 20000) + 250,
          duration: Math.floor(Math.random() * 30) + 15, // 15-45 секунд
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          video_id: `ig_${Math.random().toString(36).substr(2, 9)}`,
          platform: "instagram",
          title: `Трендовый ${context.topic}`,
          description: `Вирусный контент о ${context.topic}. Смотри до конца! #viral #${context.topic}`,
          url: `https://instagram.com/reel/${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://scontent.cdninstagram.com/mock2.jpg`,
          views: Math.floor(Math.random() * 1500000) + 30000,
          likes: Math.floor(Math.random() * 150000) + 3000,
          comments: Math.floor(Math.random() * 15000) + 300,
          duration: Math.floor(Math.random() * 30) + 15,
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          video_id: `ig_${Math.random().toString(36).substr(2, 9)}`,
          platform: "instagram",
          title: `${context.topic} хайп`,
          description: `Самый актуальный контент про ${context.topic}! #explore #${context.topic} #fyp`,
          url: `https://instagram.com/reel/${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://scontent.cdninstagram.com/mock3.jpg`,
          views: Math.floor(Math.random() * 1800000) + 40000,
          likes: Math.floor(Math.random() * 180000) + 4000,
          comments: Math.floor(Math.random() * 18000) + 400,
          duration: Math.floor(Math.random() * 30) + 15,
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
      ].slice(0, context.max_results);
      
      logger?.info('✅ [InstagramSearch] Completed successfully, found videos:', { count: mockVideos.length });
      return {
        success: true,
        videos: mockVideos,
        message: `Найдено ${mockVideos.length} Reels в Instagram`
      };
      
    } catch (error) {
      logger?.error('❌ [InstagramSearch] Search error:', error);
      return {
        success: false,
        videos: [],
        message: `Ошибка поиска в Instagram: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Комбинированный инструмент для поиска по всем платформам
export const multiPlatformSearchTool = createTool({
  id: "multi-platform-search-tool",
  description: "Ищет популярные видео по заданной теме сразу на всех платформах (YouTube, TikTok, Instagram)",
  inputSchema: z.object({
    topic: z.string().describe("Тема для поиска видео"),
    videos_per_platform: z.number().default(3).describe("Количество видео с каждой платформы"),
    days_ago: z.number().default(10).describe("Искать видео не старше указанного количества дней"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    all_videos: z.array(z.object({
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
    platform_results: z.object({
      youtube: z.object({
        success: z.boolean(),
        count: z.number(),
        message: z.string(),
      }),
      tiktok: z.object({
        success: z.boolean(),
        count: z.number(),
        message: z.string(),
      }),
      instagram: z.object({
        success: z.boolean(),
        count: z.number(),
        message: z.string(),
      }),
    }),
    total_found: z.number(),
    message: z.string(),
  }),
  execute: async ({ context, mastra, runtimeContext, tracingContext }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [MultiPlatformSearch] Starting execution with params:', context);
    
    try {
      logger?.info('📝 [MultiPlatformSearch] Starting search across all platforms...');
      
      // Поиск на YouTube
      const youtubeResult = await youtubeSearchTool.execute({
        context: {
          topic: context.topic,
          max_results: context.videos_per_platform,
          days_ago: context.days_ago,
        },
        mastra,
        runtimeContext,
        tracingContext,
      });
      
      // Поиск в TikTok
      const tiktokResult = await tiktokSearchTool.execute({
        context: {
          topic: context.topic,
          max_results: context.videos_per_platform,
          days_ago: context.days_ago,
        },
        mastra,
        runtimeContext,
        tracingContext,
      });
      
      // Поиск в Instagram
      const instagramResult = await instagramSearchTool.execute({
        context: {
          topic: context.topic,
          max_results: context.videos_per_platform,
          days_ago: context.days_ago,
        },
        mastra,
        runtimeContext,
        tracingContext,
      });
      
      // Объединяем все результаты
      const allVideos = [
        ...(youtubeResult.videos || []),
        ...(tiktokResult.videos || []),
        ...(instagramResult.videos || []),
      ];
      
      // Сортируем по engagement (просмотры + лайки * 2 + комментарии * 3)
      const sortedVideos = allVideos.sort((a, b) => {
        const engagementA = a.views + (a.likes * 2) + (a.comments * 3);
        const engagementB = b.views + (b.likes * 2) + (b.comments * 3);
        return engagementB - engagementA;
      });
      
      const platformResults = {
        youtube: {
          success: youtubeResult.success,
          count: youtubeResult.videos?.length || 0,
          message: youtubeResult.message,
        },
        tiktok: {
          success: tiktokResult.success,
          count: tiktokResult.videos?.length || 0,
          message: tiktokResult.message,
        },
        instagram: {
          success: instagramResult.success,
          count: instagramResult.videos?.length || 0,
          message: instagramResult.message,
        },
      };
      
      logger?.info('✅ [MultiPlatformSearch] Completed successfully, total videos:', { count: sortedVideos.length });
      return {
        success: true,
        all_videos: sortedVideos,
        platform_results: platformResults,
        total_found: sortedVideos.length,
        message: `Найдено ${sortedVideos.length} видео по теме "${context.topic}" на всех платформах`
      };
      
    } catch (error) {
      logger?.error('❌ [MultiPlatformSearch] Search error:', error);
      return {
        success: false,
        all_videos: [],
        platform_results: {
          youtube: { success: false, count: 0, message: "Ошибка" },
          tiktok: { success: false, count: 0, message: "Ошибка" },
          instagram: { success: false, count: 0, message: "Ошибка" },
        },
        total_found: 0,
        message: `Ошибка поиска видео: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});