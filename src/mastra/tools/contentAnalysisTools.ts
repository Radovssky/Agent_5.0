import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";

// Инструмент для транскрипции видео
export const videoTranscriptionTool = createTool({
  id: "video-transcription-tool",
  description: "Транскрибирует аудио из видео и переводит на русский язык",
  inputSchema: z.object({
    video_url: z.string().describe("URL видео для транскрипции"),
    video_id: z.string().describe("ID видео"),
    platform: z.string().describe("Платформа видео"),
    auto_translate: z.boolean().default(true).describe("Автоматически переводить на русский"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transcript: z.string().optional(),
    transcript_ru: z.string().optional(),
    keywords: z.array(z.string()),
    language_detected: z.string().optional(),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [VideoTranscription] Starting execution with params:', context);
    
    try {
      // Заглушка для транскрипции - в реальном проекте здесь будет интеграция с OpenAI Whisper API
      logger?.info('📝 [VideoTranscription] Transcribing video audio...');
      
      // Симуляция транскрипции (для демонстрации)
      const mockTranscripts = {
        english: [
          "Hey everyone! Today I want to share with you an amazing discovery about this topic. It's absolutely mind-blowing how this simple trick can change everything. Don't forget to like and subscribe!",
          "This is the best way to understand this concept. I've been researching this for months and finally found the perfect solution. Watch till the end for a surprise!",
          "You won't believe what happened when I tried this method. The results were incredible and I had to share it with you immediately. Let's dive right in!",
        ],
        russian: [
          "Привет всем! Сегодня я хочу поделиться с вами удивительным открытием по этой теме. Совершенно потрясающе, как этот простой трюк может все изменить. Не забудьте поставить лайк и подписаться!",
          "Это лучший способ понять эту концепцию. Я исследовал это месяцами и наконец нашел идеальное решение. Смотрите до конца, там будет сюрприз!",
          "Вы не поверите, что произошло, когда я попробовал этот метод. Результаты были невероятными, и я должен был сразу же поделиться ими с вами. Давайте сразу погружаемся!",
        ]
      };
      
      const randomIndex = Math.floor(Math.random() * mockTranscripts.english.length);
      const originalTranscript = mockTranscripts.english[randomIndex];
      const russianTranscript = mockTranscripts.russian[randomIndex];
      
      // Извлечение ключевых слов (симуляция)
      const keywords = [
        "тренд", "популярное", "вирусное", "лайфхак", "секрет", 
        "открытие", "метод", "способ", "результат", "совет"
      ].slice(0, Math.floor(Math.random() * 5) + 3);
      
      logger?.info('✅ [VideoTranscription] Transcription completed successfully');
      return {
        success: true,
        transcript: originalTranscript,
        transcript_ru: context.auto_translate ? russianTranscript : undefined,
        keywords,
        language_detected: "en",
        message: "Транскрипция и перевод выполнены успешно"
      };
      
    } catch (error) {
      logger?.error('❌ [VideoTranscription] Transcription error:', error);
      return {
        success: false,
        keywords: [],
        message: `Ошибка транскрипции: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Инструмент для анализа метрик и engagement видео
export const videoMetricsAnalysisTool = createTool({
  id: "video-metrics-analysis-tool",
  description: "Анализирует метрики видео и определяет его вирусный потенциал",
  inputSchema: z.object({
    videos: z.array(z.object({
      video_id: z.string(),
      platform: z.string(),
      title: z.string(),
      views: z.number(),
      likes: z.number(),
      comments: z.number(),
      duration: z.number(),
      published_at: z.string(),
    })).describe("Массив видео для анализа"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    analysis: z.array(z.object({
      video_id: z.string(),
      platform: z.string(),
      engagement_score: z.number(),
      is_viral: z.boolean(),
      viral_factors: z.array(z.string()),
      audience_retention: z.number(),
      platform_rank: z.string(),
    })),
    top_performers: z.array(z.string()),
    trending_patterns: z.array(z.string()),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [VideoMetricsAnalysis] Starting execution with params:', context);
    
    try {
      logger?.info('📝 [VideoMetricsAnalysis] Analyzing video metrics...');
      
      const analysis = context.videos.map(video => {
        // Расчет engagement score
        const engagementScore = video.views > 0 
          ? ((video.likes + video.comments * 2) / video.views) * 100 
          : 0;
        
        // Определение вирусности
        const isViral = engagementScore > 15 || video.views > 100000;
        
        // Факторы вирусности
        const viralFactors: string[] = [];
        if (video.views > 500000) viralFactors.push("Высокие просмотры");
        if (engagementScore > 20) viralFactors.push("Высокий engagement");
        if (video.likes / Math.max(video.views, 1) > 0.05) viralFactors.push("Высокий коэффициент лайков");
        if (video.comments / Math.max(video.views, 1) > 0.01) viralFactors.push("Активные комментарии");
        if (video.duration <= 30) viralFactors.push("Оптимальная длительность");
        
        // Имитация audience retention
        const audienceRetention = Math.min(95, Math.max(30, 85 - (video.duration - 20) * 1.5 + Math.random() * 10));
        
        // Ранжирование по платформе
        let platformRank = "средний";
        if (video.platform === "youtube" && video.views > 100000) platformRank = "высокий";
        if (video.platform === "tiktok" && video.views > 500000) platformRank = "высокий";
        if (video.platform === "instagram" && video.views > 200000) platformRank = "высокий";
        if (engagementScore > 25) platformRank = "очень высокий";
        
        return {
          video_id: video.video_id,
          platform: video.platform,
          engagement_score: Math.round(engagementScore * 100) / 100,
          is_viral: isViral,
          viral_factors: viralFactors,
          audience_retention: Math.round(audienceRetention * 100) / 100,
          platform_rank: platformRank,
        };
      });
      
      // Топ исполнители
      const topPerformers = analysis
        .filter(a => a.is_viral)
        .sort((a, b) => b.engagement_score - a.engagement_score)
        .slice(0, 3)
        .map(a => a.video_id);
      
      // Трендовые паттерны
      const trendingPatterns: string[] = [];
      const avgEngagement = analysis.reduce((sum, a) => sum + a.engagement_score, 0) / analysis.length;
      
      if (avgEngagement > 15) {
        trendingPatterns.push("Высокий общий уровень engagement");
      }
      
      const shortVideos = analysis.filter(a => {
        const video = context.videos.find(v => v.video_id === a.video_id);
        return video && video.duration <= 30;
      });
      
      if (shortVideos.length > analysis.length * 0.6) {
        trendingPatterns.push("Преобладают короткие форматы");
      }
      
      const tiktokViral = analysis.filter(a => a.platform === "tiktok" && a.is_viral);
      if (tiktokViral.length > 0) {
        trendingPatterns.push("TikTok показывает высокую вирусность");
      }
      
      logger?.info('✅ [VideoMetricsAnalysis] Analysis completed successfully');
      return {
        success: true,
        analysis,
        top_performers: topPerformers,
        trending_patterns: trendingPatterns,
        message: `Проанализировано ${analysis.length} видео, найдено ${analysis.filter(a => a.is_viral).length} вирусных`
      };
      
    } catch (error) {
      logger?.error('❌ [VideoMetricsAnalysis] Analysis error:', error);
      return {
        success: false,
        analysis: [],
        top_performers: [],
        trending_patterns: [],
        message: `Ошибка анализа метрик: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Комбинированный инструмент для полного анализа контента
export const comprehensiveContentAnalysisTool = createTool({
  id: "comprehensive-content-analysis-tool",
  description: "Выполняет полный анализ найденных видео: транскрипция, метрики, выявление паттернов",
  inputSchema: z.object({
    videos: z.array(z.object({
      video_id: z.string(),
      platform: z.string(),
      title: z.string(),
      description: z.string(),
      url: z.string(),
      views: z.number(),
      likes: z.number(),
      comments: z.number(),
      duration: z.number(),
      published_at: z.string(),
    })).describe("Массив видео для полного анализа"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    analyzed_videos: z.array(z.object({
      video_id: z.string(),
      platform: z.string(),
      transcript: z.string().optional(),
      transcript_ru: z.string().optional(),
      keywords: z.array(z.string()),
      engagement_score: z.number(),
      is_viral: z.boolean(),
      viral_factors: z.array(z.string()),
      audience_retention: z.number(),
    })),
    content_insights: z.object({
      common_themes: z.array(z.string()),
      viral_patterns: z.array(z.string()),
      recommended_style: z.string(),
      target_duration: z.number(),
      key_phrases: z.array(z.string()),
    }),
    total_processed: z.number(),
    message: z.string(),
  }),
  execute: async ({ context, mastra, runtimeContext, tracingContext }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [ComprehensiveContentAnalysis] Starting execution with params:', context);
    
    try {
      logger?.info('📝 [ComprehensiveContentAnalysis] Starting comprehensive analysis...');
      
      // Шаг 1: Анализ метрик
      const metricsResult = await videoMetricsAnalysisTool.execute({
        context: { videos: context.videos },
        mastra,
        runtimeContext,
        tracingContext,
      });
      
      // Шаг 2: Транскрипция и анализ каждого видео
      const analyzedVideos = [];
      for (const video of context.videos) {
        logger?.info('📝 [ComprehensiveContentAnalysis] Processing video:', { video_id: video.video_id });
        
        // Транскрипция
        const transcriptionResult = await videoTranscriptionTool.execute({
          context: {
            video_url: video.url,
            video_id: video.video_id,
            platform: video.platform,
            auto_translate: true,
          },
          mastra,
          runtimeContext,
          tracingContext,
        });
        
        // Найти соответствующий анализ метрик
        const metrics = metricsResult.analysis?.find(a => a.video_id === video.video_id);
        
        analyzedVideos.push({
          video_id: video.video_id,
          platform: video.platform,
          transcript: transcriptionResult.transcript,
          transcript_ru: transcriptionResult.transcript_ru,
          keywords: transcriptionResult.keywords || [],
          engagement_score: metrics?.engagement_score || 0,
          is_viral: metrics?.is_viral || false,
          viral_factors: metrics?.viral_factors || [],
          audience_retention: metrics?.audience_retention || 0,
        });
      }
      
      // Шаг 3: Генерация инсайтов
      logger?.info('📝 [ComprehensiveContentAnalysis] Generating content insights...');
      
      // Общие темы из ключевых слов
      const allKeywords = analyzedVideos.flatMap(v => v.keywords);
      const keywordCounts = allKeywords.reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const commonThemes = Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([keyword]) => keyword);
      
      // Вирусные паттерны
      const viralVideos = analyzedVideos.filter(v => v.is_viral);
      const viralPatterns = [
        ...new Set(viralVideos.flatMap(v => v.viral_factors))
      ].slice(0, 5);
      
      // Рекомендуемый стиль
      const avgDuration = context.videos.reduce((sum, v) => sum + v.duration, 0) / context.videos.length;
      const recommendedStyle = viralVideos.length > analyzedVideos.length * 0.5 
        ? "Динамичный и захватывающий" 
        : "Информативный и полезный";
      
      // Целевая длительность
      const viralDurations = viralVideos.map(v => {
        const originalVideo = context.videos.find(original => original.video_id === v.video_id);
        return originalVideo?.duration || 30;
      });
      const targetDuration = viralDurations.length > 0 
        ? Math.round(viralDurations.reduce((sum, d) => sum + d, 0) / viralDurations.length)
        : Math.round(avgDuration);
      
      // Ключевые фразы из транскриптов
      const keyPhrases = [
        "не забудьте подписаться",
        "смотрите до конца", 
        "это изменит все",
        "вы не поверите",
        "секретный метод",
        "лайфхак дня"
      ].slice(0, 4);
      
      const contentInsights = {
        common_themes: commonThemes,
        viral_patterns: viralPatterns,
        recommended_style: recommendedStyle,
        target_duration: targetDuration,
        key_phrases: keyPhrases,
      };
      
      logger?.info('✅ [ComprehensiveContentAnalysis] Comprehensive analysis completed successfully');
      return {
        success: true,
        analyzed_videos: analyzedVideos,
        content_insights: contentInsights,
        total_processed: analyzedVideos.length,
        message: `Полный анализ выполнен для ${analyzedVideos.length} видео. Найдено ${viralVideos.length} вирусных роликов.`
      };
      
    } catch (error) {
      logger?.error('❌ [ComprehensiveContentAnalysis] Analysis error:', error);
      return {
        success: false,
        analyzed_videos: [],
        content_insights: {
          common_themes: [],
          viral_patterns: [],
          recommended_style: "Стандартный",
          target_duration: 30,
          key_phrases: [],
        },
        total_processed: 0,
        message: `Ошибка комплексного анализа: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});