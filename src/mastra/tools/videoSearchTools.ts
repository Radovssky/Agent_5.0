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
    
    try {
      // Заглушка для YouTube API - в реальном проекте здесь будет интеграция с YouTube Data API
      logger?.info('📝 [YouTubeSearch] Searching for videos...');
      
      // Симуляция поиска видео (для демонстрации)
      const mockVideos = [
        {
          video_id: `yt_${Math.random().toString(36).substr(2, 9)}`,
          platform: "youtube",
          title: `${context.topic} - Популярное видео 1`,
          description: `Описание видео о ${context.topic}. Это тренд, который набирает популярность.`,
          url: `https://youtube.com/shorts/mock_${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://img.youtube.com/vi/mock/hqdefault.jpg`,
          views: Math.floor(Math.random() * 1000000) + 10000,
          likes: Math.floor(Math.random() * 50000) + 1000,
          comments: Math.floor(Math.random() * 5000) + 100,
          duration: Math.floor(Math.random() * 30) + 15, // 15-45 секунд
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          video_id: `yt_${Math.random().toString(36).substr(2, 9)}`,
          platform: "youtube",
          title: `${context.topic} - Вирусный контент`,
          description: `Еще одно видео про ${context.topic} с высоким engagement.`,
          url: `https://youtube.com/shorts/mock_${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://img.youtube.com/vi/mock2/hqdefault.jpg`,
          views: Math.floor(Math.random() * 2000000) + 50000,
          likes: Math.floor(Math.random() * 100000) + 5000,
          comments: Math.floor(Math.random() * 10000) + 500,
          duration: Math.floor(Math.random() * 30) + 15,
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          video_id: `yt_${Math.random().toString(36).substr(2, 9)}`,
          platform: "youtube",
          title: `Лучшее про ${context.topic}`,
          description: `Топовое видео о ${context.topic} с отличными метриками.`,
          url: `https://youtube.com/shorts/mock_${Math.random().toString(36).substr(2, 9)}`,
          thumbnail_url: `https://img.youtube.com/vi/mock3/hqdefault.jpg`,
          views: Math.floor(Math.random() * 1500000) + 25000,
          likes: Math.floor(Math.random() * 75000) + 2500,
          comments: Math.floor(Math.random() * 7500) + 250,
          duration: Math.floor(Math.random() * 30) + 15,
          published_at: new Date(Date.now() - Math.floor(Math.random() * context.days_ago) * 24 * 60 * 60 * 1000).toISOString(),
        },
      ].slice(0, context.max_results);
      
      logger?.info('✅ [YouTubeSearch] Completed successfully, found videos:', { count: mockVideos.length });
      return {
        success: true,
        videos: mockVideos,
        message: `Найдено ${mockVideos.length} видео на YouTube`
      };
      
    } catch (error) {
      logger?.error('❌ [YouTubeSearch] Search error:', error);
      return {
        success: false,
        videos: [],
        message: `Ошибка поиска на YouTube: ${error instanceof Error ? error.message : 'Unknown error'}`
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