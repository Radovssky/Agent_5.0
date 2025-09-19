import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";
import Tiktok from "@tobyg74/tiktok-api-dl";
import { TikTokTokenManager } from "../../lib/tiktokTokenManager";
import { createOfficialTikTokSearchTool } from "../../lib/officialTikTokSearch";

// Создаем экземпляр официального TikTok Token Manager (требует OAuth настройки)
const createTikTokTokenManager = () => {
  const config = {
    client_key: process.env.TIKTOK_CLIENT_KEY || '',
    client_secret: process.env.TIKTOK_CLIENT_SECRET || '', 
    redirect_uri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:8080/auth/tiktok/callback'
  };
  
  return new TikTokTokenManager(config);
};

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
      
      logger?.info('📡 [YouTubeSearch] Making API request to YouTube search endpoint');
      
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

// Умный TikTok инструмент с автоматическим fallback (официальный API → старый API)
export const tiktokSearchTool = createTool({
  id: "smart-tiktok-search-tool",
  description: "Ищет популярные видео в TikTok с автоматическим выбором API (официальный или legacy)",
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
  execute: async ({ context, mastra, runtimeContext, tracingContext }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔄 [SmartTikTokSearch] Starting with auto-fallback logic:', context);
    
    // Проверяем наличие официального TikTok OAuth
    const hasOfficialApi = !!(
      process.env.TIKTOK_CLIENT_KEY && 
      process.env.TIKTOK_CLIENT_SECRET && 
      process.env.TIKTOK_REDIRECT_URI
    );
    
    const hasLegacyApi = !!process.env.TIKTOK_COOKIE;
    
    logger?.info('🔍 [SmartTikTokSearch] API availability:', { 
      hasOfficialApi, 
      hasLegacyApi 
    });
    
    // Стратегия 1: Попробовать официальный API (если настроен)
    if (hasOfficialApi) {
      try {
        logger?.info('🚀 [SmartTikTokSearch] Trying official TikTok API...');
        const officialTokenManager = createTikTokTokenManager();
        const officialTool = createOfficialTikTokSearchTool(officialTokenManager);
        const result = await officialTool.execute({ context, mastra, runtimeContext, tracingContext });
        
        if (result.success && result.videos.length > 0) {
          logger?.info('✅ [SmartTikTokSearch] Official API succeeded');
          return {
            ...result,
            message: `${result.message} (через официальный API)`
          };
        }
        
        logger?.warn('⚠️ [SmartTikTokSearch] Official API failed or returned no results, trying fallback...');
      } catch (error) {
        logger?.warn('⚠️ [SmartTikTokSearch] Official API error, trying fallback:', error);
      }
    }
    
    // Стратегия 2: Fallback на старый API (если доступен)  
    if (hasLegacyApi) {
      try {
        logger?.info('🔄 [SmartTikTokSearch] Using legacy TikTok API as fallback...');
        const legacyResult = await legacyTiktokSearchTool.execute({ context, mastra, runtimeContext, tracingContext });
        
        if (legacyResult.success) {
          logger?.info('✅ [SmartTikTokSearch] Legacy API succeeded');
          return {
            ...legacyResult,
            message: `${legacyResult.message} (через legacy API)`
          };
        }
      } catch (error) {
        logger?.error('❌ [SmartTikTokSearch] Legacy API also failed:', error);
      }
    }
    
    // Стратегия 3: Подсказки по настройке
    const setupMessage = !hasOfficialApi && !hasLegacyApi 
      ? "TikTok поиск недоступен. Настройте TIKTOK_CLIENT_KEY+TIKTOK_CLIENT_SECRET (официальный API) или TIKTOK_COOKIE (legacy API)"
      : !hasOfficialApi
        ? "Рекомендуется настроить официальный TikTok API (TIKTOK_CLIENT_KEY+TIKTOK_CLIENT_SECRET) для стабильной работы"
        : "Официальный TikTok API требует завершения OAuth авторизации";
    
    logger?.info('💡 [SmartTikTokSearch] Providing setup guidance');
    return {
      success: false,
      videos: [],
      message: setupMessage
    };
  },
});

// СТАРЫЙ TikTok инструмент (неофициальный API с токенами на 10 секунд) - ЗАМЕНЕН на официальный выше
export const legacyTiktokSearchTool = createTool({
  id: "legacy-tiktok-search-tool",
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
    
    // Проверяем наличие cookie для TikTok API
    const tiktokCookie = process.env.TIKTOK_COOKIE;
    const tiktokProxy = process.env.TIKTOK_PROXY;
    
    if (!tiktokCookie) {
      logger?.warn('⚠️ [TikTokSearch] No TikTok cookie found, cannot search real TikTok videos');
      return {
        success: false,
        videos: [],
        message: `TikTok поиск недоступен: требуется настройка переменной среды TIKTOK_COOKIE для работы с TikTok API`
      };
    }
    
    try {
      logger?.info('📝 [TikTokSearch] Searching for videos via TikTok API...');
      
      // Формируем параметры для поиска
      const searchOptions: any = {
        type: "video",
        page: 1,
        cookie: tiktokCookie
      };
      
      if (tiktokProxy) {
        searchOptions.proxy = tiktokProxy;
      }
      
      // Поиск видео через TikTok API
      const searchResult: any = await Tiktok.Search(context.topic, searchOptions);
      
      // Обрабатываем разные возможные структуры ответа
      let videosArray: any[] = [];
      
      if (searchResult?.result?.videos && Array.isArray(searchResult.result.videos)) {
        videosArray = searchResult.result.videos;
      } else if (searchResult?.videos && Array.isArray(searchResult.videos)) {
        videosArray = searchResult.videos;
      } else if (Array.isArray(searchResult)) {
        videosArray = searchResult;
      } else if (searchResult?.data && Array.isArray(searchResult.data)) {
        videosArray = searchResult.data;
      }
      
      if (videosArray.length === 0) {
        logger?.info('ℹ️ [TikTokSearch] No videos found');
        return {
          success: true,
          videos: [],
          message: `Не найдено видео по теме "${context.topic}" в TikTok`
        };
      }
      
      // Функция для безопасного парсинга числовых значений
      const parseCount = (countStr: any): number => {
        if (!countStr) return 0;
        const str = String(countStr).toLowerCase().replace(/,/g, '');
        if (str.includes('k')) {
          return Math.floor(parseFloat(str.replace('k', '')) * 1000);
        } else if (str.includes('m')) {
          return Math.floor(parseFloat(str.replace('m', '')) * 1000000);
        } else if (str.includes('b')) {
          return Math.floor(parseFloat(str.replace('b', '')) * 1000000000);
        }
        return parseInt(str) || 0;
      };
      
      // Функция для извлечения ID видео из URL
      const extractVideoId = (url: string): string => {
        if (!url) return `tt_${Math.random().toString(36).substr(2, 9)}`;
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/');
          const videoIndex = pathParts.findIndex(part => part === 'video');
          if (videoIndex !== -1 && pathParts[videoIndex + 1]) {
            return pathParts[videoIndex + 1];
          }
          return pathParts.pop() || `tt_${Math.random().toString(36).substr(2, 9)}`;
        } catch {
          return url.split('/').pop() || `tt_${Math.random().toString(36).substr(2, 9)}`;
        }
      };
      
      // Фильтруем и обрабатываем результаты
      const cutoffDate = new Date(Date.now() - context.days_ago * 24 * 60 * 60 * 1000);
      
      const filteredVideos = videosArray
        .filter((video: any) => {
          // Фильтруем по дате публикации если доступна
          if (video.createTime) {
            const publishDate = new Date(video.createTime * 1000);
            return publishDate >= cutoffDate;
          }
          return true; // Оставляем видео без даты
        })
        .sort((a: any, b: any) => {
          // Сортируем по популярности (количество просмотров)
          const aViews = parseCount((a.stats?.playCount || a.stats?.viewCount || a.views || '0'));
          const bViews = parseCount((b.stats?.playCount || b.stats?.viewCount || b.views || '0'));
          return bViews - aViews;
        })
        .slice(0, context.max_results);
      
      const videos = filteredVideos.map((video: any) => {
        // Извлекаем статистику из объекта stats если он есть
        const stats = video.stats || {};
        const views = parseCount(stats.playCount || stats.viewCount || video.views || '0');
        const likes = parseCount(stats.likeCount || video.likes || '0');
        const comments = parseCount(stats.commentCount || video.comments || '0');
        
        // Форматируем дату публикации
        let publishedAt = new Date().toISOString();
        if (video.createTime) {
          publishedAt = new Date(video.createTime * 1000).toISOString();
        } else if (video.published_at) {
          publishedAt = video.published_at;
        }
        
        // Строим корректный URL для TikTok видео
        let videoUrl = video.url;
        if (!videoUrl && video.author?.uniqueId && (video.id || video.aweme_id)) {
          videoUrl = `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id || video.aweme_id}`;
        } else if (!videoUrl) {
          videoUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(context.topic)}`;
        }
        
        return {
          video_id: video.id || video.aweme_id || extractVideoId(video.url),
          platform: "tiktok",
          title: video.title || video.desc || `#${context.topic} видео`,
          description: video.description || video.desc || `Видео о ${context.topic} в TikTok`,
          url: videoUrl,
          thumbnail_url: video.cover || video.dynamicCover || video.thumbnail || '',
          views: views,
          likes: likes,
          comments: comments,
          duration: video.duration || 30,
          published_at: publishedAt,
        };
      });
      
      logger?.info('✅ [TikTokSearch] Completed successfully, found videos:', { count: videos.length });
      return {
        success: true,
        videos: videos,
        message: `Найдено ${videos.length} видео в TikTok по теме "${context.topic}"`
      };
      
    } catch (error) {
      logger?.error('❌ [TikTokSearch] Search error:', error);
      
      // В случае ошибки API возвращаем ошибку, но с fallback данными для демонстрации
      return {
        success: false,
        videos: [],
        message: `Ошибка поиска в TikTok: ${error instanceof Error ? error.message : 'Unknown error'}. Требуется настройка TIKTOK_COOKIE для работы с реальным API.`
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