import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";

// Инструмент для генерации сценария на основе анализа видео
export const generateScriptTool = createTool({
  id: "generate-script-tool",
  description: "Генерирует оригинальный сценарий на основе анализа популярных видео",
  inputSchema: z.object({
    topic: z.string().describe("Основная тема для сценария"),
    analyzed_videos: z.array(z.object({
      video_id: z.string(),
      platform: z.string(),
      transcript_ru: z.string().optional(),
      keywords: z.array(z.string()),
      engagement_score: z.number(),
      is_viral: z.boolean(),
      viral_factors: z.array(z.string()),
    })).describe("Массив проанализированных видео"),
    content_insights: z.object({
      common_themes: z.array(z.string()),
      viral_patterns: z.array(z.string()),
      recommended_style: z.string(),
      target_duration: z.number(),
      key_phrases: z.array(z.string()),
    }).describe("Инсайты из анализа контента"),
    style_preference: z.enum(["динамичный", "информативный", "развлекательный", "мотивационный"]).default("динамичный").describe("Предпочитаемый стиль сценария"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    script: z.object({
      title: z.string(),
      hook: z.string(),
      main_content: z.string(),
      call_to_action: z.string(),
      full_script: z.string(),
      estimated_duration: z.number(),
      visual_directions: z.array(z.string()),
      emotion_markers: z.array(z.string()),
    }).optional(),
    inspiration_sources: z.array(z.string()),
    viral_elements_used: z.array(z.string()),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [GenerateScript] Starting execution with params:', context);
    
    try {
      logger?.info('📝 [GenerateScript] Analyzing video patterns and generating script...');
      
      // Фильтруем наиболее вирусные видео для анализа
      const viralVideos = context.analyzed_videos
        .filter(v => v.is_viral)
        .sort((a, b) => b.engagement_score - a.engagement_score);
      
      // Собираем успешные паттерны
      const allKeywords = context.analyzed_videos.flatMap(v => v.keywords);
      const viralFactors = [...new Set(viralVideos.flatMap(v => v.viral_factors))];
      
      // Генерируем элементы сценария
      const hooks = [
        `Вы никогда не угадаете, что произошло, когда я попробовал ${context.topic}!`,
        `Этот секрет про ${context.topic} изменит вашу жизнь за 30 секунд!`,
        `СТОП! Перед тем как пролистать, посмотрите этот ${context.topic} лайфхак!`,
        `Я не поверил своим глазам, когда увидел результат этого ${context.topic}!`,
        `Каждый должен знать эту правду про ${context.topic}!`,
      ];
      
      const mainContentTemplates = [
        `Итак, вот что я обнаружил про ${context.topic}. Первое - это кардинально меняет подход к проблеме. Второе - работает буквально для всех. И третье - результат видно уже через несколько минут!`,
        `Давайте разберем ${context.topic} по шагам. Шаг первый: ${context.content_insights.common_themes[0] || 'основа'}. Шаг второй: применяем секретную технику. Шаг третий: получаем потрясающий результат!`,
        `Про ${context.topic} есть три важных факта, которые скрывают от вас. Факт номер один изменит ваше мнение. Факт номер два - шокирует. А факт номер три заставит действовать прямо сейчас!`,
      ];
      
      const callToActions = [
        "Ставьте лайк, если было полезно, и подписывайтесь на канал для еще большего количества таких секретов!",
        "Обязательно сохраните это видео и поделитесь с друзьями! И не забудьте подписаться!",
        "Комментируйте, получилось ли у вас! Лайк за крутой контент и подписка за еще больше лайфхаков!",
        "Если вам понравилось - лайк! Хотите еще такого контента - подписка! Увидимся в следующем видео!",
      ];
      
      // Выбираем случайные элементы
      const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];
      const selectedMainContent = mainContentTemplates[Math.floor(Math.random() * mainContentTemplates.length)];
      const selectedCTA = callToActions[Math.floor(Math.random() * callToActions.length)];
      
      // Создаем финальный сценарий
      const fullScript = `${selectedHook}\n\n${selectedMainContent}\n\n${selectedCTA}`;
      
      // Генерируем визуальные указания
      const visualDirections = [
        "Крупный план лица с удивленным выражением",
        "Быстрая смена кадров для создания динамики",
        "Использование ярких цветов и контрастов",
        "Текстовые вставки с ключевыми фразами",
        "Движение камеры для поддержания внимания",
      ];
      
      // Эмоциональные маркеры
      const emotionMarkers = [
        "Энтузиазм в начале",
        "Интрига в середине", 
        "Удовлетворение в конце",
        "Паузы для создания напряжения",
        "Повышение тона на ключевых моментах",
      ];
      
      // Источники вдохновения
      const inspirationSources = viralVideos
        .slice(0, 3)
        .map(v => `${v.platform}: ${v.video_id} (${v.engagement_score}% engagement)`);
      
      const script = {
        title: `${context.topic}: Секрет, который изменит все!`,
        hook: selectedHook,
        main_content: selectedMainContent,
        call_to_action: selectedCTA,
        full_script: fullScript,
        estimated_duration: Math.min(Math.max(context.content_insights.target_duration, 20), 45),
        visual_directions: visualDirections.slice(0, 3),
        emotion_markers: emotionMarkers.slice(0, 3),
      };
      
      logger?.info('✅ [GenerateScript] Script generated successfully');
      return {
        success: true,
        script,
        inspiration_sources: inspirationSources,
        viral_elements_used: viralFactors.slice(0, 3),
        message: `Сценарий успешно сгенерирован на основе анализа ${context.analyzed_videos.length} видео`
      };
      
    } catch (error) {
      logger?.error('❌ [GenerateScript] Script generation error:', error);
      return {
        success: false,
        inspiration_sources: [],
        viral_elements_used: [],
        message: `Ошибка генерации сценария: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Инструмент для улучшения существующего сценария
export const improveScriptTool = createTool({
  id: "improve-script-tool", 
  description: "Улучшает существующий сценарий на основе пользовательских замечаний",
  inputSchema: z.object({
    current_script: z.string().describe("Текущий текст сценария"),
    improvement_notes: z.string().describe("Замечания пользователя для улучшения"),
    topic: z.string().describe("Основная тема сценария"),
    target_duration: z.number().default(30).describe("Целевая длительность в секундах"),
    style_adjustments: z.array(z.string()).default([]).describe("Дополнительные стилистические корректировки"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    improved_script: z.object({
      title: z.string(),
      hook: z.string(),
      main_content: z.string(),
      call_to_action: z.string(),
      full_script: z.string(),
      estimated_duration: z.number(),
      changes_made: z.array(z.string()),
    }).optional(),
    improvement_summary: z.string(),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [ImproveScript] Starting execution with params:', context);
    
    try {
      logger?.info('📝 [ImproveScript] Analyzing improvement requests and updating script...');
      
      // Парсим текущий сценарий
      const scriptParts = context.current_script.split('\n\n');
      let hook = scriptParts[0] || '';
      let mainContent = scriptParts[1] || '';
      let cta = scriptParts[2] || '';
      
      const changesMade: string[] = [];
      
      // Анализируем замечания и применяем улучшения
      const notes = context.improvement_notes.toLowerCase();
      
      // Улучшения хука
      if (notes.includes('крючок') || notes.includes('начало') || notes.includes('хук')) {
        const newHooks = [
          `ВНИМАНИЕ! То, что я расскажу про ${context.topic}, перевернет ваш мир!`,
          `Этот ${context.topic} секрет знают только 1% людей!`,
          `СТОП СКРОЛЛ! Вы ДОЛЖНЫ увидеть что происходит с ${context.topic}!`,
        ];
        hook = newHooks[Math.floor(Math.random() * newHooks.length)];
        changesMade.push("Обновлен крючок для лучшего привлечения внимания");
      }
      
      if (notes.includes('короче') || notes.includes('сократить')) {
        mainContent = mainContent.substring(0, Math.floor(mainContent.length * 0.7)) + "...";
        changesMade.push("Сокращено основное содержание");
      }
      
      if (notes.includes('длиннее') || notes.includes('подробнее')) {
        mainContent += ` А еще важно понимать, что ${context.topic} имеет множество нюансов, которые нужно учитывать. Давайте разберем каждый из них детально...`;
        changesMade.push("Расширено основное содержание");
      }
      
      if (notes.includes('эмоции') || notes.includes('эмоциональнее')) {
        hook = hook.replace(/!/g, '!!!').toUpperCase();
        mainContent = `🔥 ${mainContent} 🔥`;
        changesMade.push("Добавлено больше эмоциональности");
      }
      
      if (notes.includes('призыв') || notes.includes('действие') || notes.includes('cta')) {
        const newCTAs = [
          "СРОЧНО ставьте лайк и подписывайтесь! Такого контента больше нигде не найдете!",
          "Лайк если помогло! Подписка если хотите больше таких секретов! Комментарий с вашим результатом!",
          "Не пролистывайте! Лайк за ценную информацию и подписка за эксклюзивный контент каждый день!",
        ];
        cta = newCTAs[Math.floor(Math.random() * newCTAs.length)];
        changesMade.push("Усилен призыв к действию");
      }
      
      if (notes.includes('заголовок') || notes.includes('название')) {
        const newTitles = [
          `${context.topic}: ШОКИРУЮЩАЯ правда!`,
          `НИКТО не расскажет вам про ${context.topic} ЭТО!`,
          `${context.topic} - секрет, который скрывают!`,
        ];
        changesMade.push("Обновлен заголовок для большей привлекательности");
      }
      
      // Применяем стилистические корректировки
      context.style_adjustments.forEach(adjustment => {
        if (adjustment.includes('динамичнее')) {
          mainContent = mainContent.replace(/\./g, '! ').replace(/,/g, ' -');
          changesMade.push("Сделано более динамично");
        }
        if (adjustment.includes('проще')) {
          mainContent = mainContent.replace(/[а-яё]{15,}/gi, 'понятный способ');
          changesMade.push("Упрощена лексика");
        }
      });
      
      // Если изменений не было, делаем общие улучшения
      if (changesMade.length === 0) {
        hook = `🚨 ${hook}`;
        mainContent = `${mainContent} Это работает в 99% случаев!`;
        cta = `${cta} Действуйте прямо сейчас!`;
        changesMade.push("Общие улучшения для повышения вовлеченности");
      }
      
      const improvedScript = {
        title: `${context.topic}: Улучшенная версия!`,
        hook,
        main_content: mainContent,
        call_to_action: cta,
        full_script: `${hook}\n\n${mainContent}\n\n${cta}`,
        estimated_duration: context.target_duration,
        changes_made: changesMade,
      };
      
      const improvementSummary = `Внесены следующие изменения: ${changesMade.join(', ')}`;
      
      logger?.info('✅ [ImproveScript] Script improved successfully');
      return {
        success: true,
        improved_script: improvedScript,
        improvement_summary: improvementSummary,
        message: `Сценарий успешно улучшен. Внесено изменений: ${changesMade.length}`
      };
      
    } catch (error) {
      logger?.error('❌ [ImproveScript] Script improvement error:', error);
      return {
        success: false,
        improvement_summary: "Ошибка при улучшении сценария",
        message: `Ошибка улучшения сценария: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// Инструмент для валидации и оптимизации сценария
export const validateScriptTool = createTool({
  id: "validate-script-tool",
  description: "Проверяет и оптимизирует сценарий по ключевым показателям эффективности",
  inputSchema: z.object({
    script: z.string().describe("Текст сценария для валидации"),
    target_duration: z.number().default(30).describe("Целевая длительность в секундах"),
    platform: z.enum(["youtube", "tiktok", "instagram", "all"]).default("all").describe("Платформа для оптимизации"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    validation_score: z.number(),
    optimization_suggestions: z.array(z.object({
      category: z.string(),
      suggestion: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })),
    readability_metrics: z.object({
      word_count: z.number(),
      sentence_count: z.number(),
      avg_sentence_length: z.number(),
      complexity_score: z.number(),
    }),
    viral_potential: z.object({
      hook_strength: z.number(),
      emotional_impact: z.number(),
      call_to_action_power: z.number(),
      overall_rating: z.number(),
    }),
    message: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [ValidateScript] Starting execution with params:', context);
    
    try {
      logger?.info('📝 [ValidateScript] Validating script quality and viral potential...');
      
      const script = context.script;
      const words = script.split(/\s+/).filter(word => word.length > 0);
      const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Метрики читаемости
      const readabilityMetrics = {
        word_count: words.length,
        sentence_count: sentences.length,
        avg_sentence_length: words.length / Math.max(sentences.length, 1),
        complexity_score: words.filter(w => w.length > 6).length / words.length,
      };
      
      // Анализ вирусного потенциала
      const viralKeywords = [
        'секрет', 'шок', 'невероятно', 'удивительно', 'лайфхак', 'тренд',
        'внимание', 'стоп', 'нельзя', 'должны', 'изменит', 'революция'
      ];
      
      const emotionalWords = [
        'потрясающий', 'невероятный', 'шокирующий', 'удивительный', 
        'фантастический', 'восхитительный', 'изумительный'
      ];
      
      const ctaWords = [
        'лайк', 'подписыв', 'комментар', 'поделиться', 'сохрани',
        'действуй', 'попробуй', 'испытай'
      ];
      
      // Оценка крючка (первые 50 символов)
      const hookText = script.substring(0, 50).toLowerCase();
      const hookViralWords = viralKeywords.filter(word => hookText.includes(word)).length;
      const hookStrength = Math.min(100, (hookViralWords * 25) + (hookText.includes('!') ? 25 : 0));
      
      // Эмоциональное воздействие
      const emotionalWordsCount = emotionalWords.filter(word => 
        script.toLowerCase().includes(word)
      ).length;
      const emotionalImpact = Math.min(100, emotionalWordsCount * 20);
      
      // Сила призыва к действию
      const ctaWordsCount = ctaWords.filter(word => 
        script.toLowerCase().includes(word)
      ).length;
      const ctaPower = Math.min(100, ctaWordsCount * 15);
      
      const viralPotential = {
        hook_strength: hookStrength,
        emotional_impact: emotionalImpact,
        call_to_action_power: ctaPower,
        overall_rating: (hookStrength + emotionalImpact + ctaPower) / 3,
      };
      
      // Предложения по оптимизации
      const suggestions = [];
      
      if (readabilityMetrics.word_count > 100) {
        suggestions.push({
          category: "Длительность",
          suggestion: "Сценарий слишком длинный для короткого видео. Рекомендуется сократить до 80-90 слов.",
          priority: "high" as const,
        });
      }
      
      if (readabilityMetrics.avg_sentence_length > 15) {
        suggestions.push({
          category: "Читаемость", 
          suggestion: "Предложения слишком длинные. Используйте более короткие фразы для лучшего восприятия.",
          priority: "medium" as const,
        });
      }
      
      if (hookStrength < 50) {
        suggestions.push({
          category: "Крючок",
          suggestion: "Начало недостаточно цепляющее. Добавьте больше интриги или используйте стоп-слова.",
          priority: "high" as const,
        });
      }
      
      if (emotionalImpact < 30) {
        suggestions.push({
          category: "Эмоции",
          suggestion: "Добавьте больше эмоциональных слов для усиления воздействия на аудиторию.",
          priority: "medium" as const,
        });
      }
      
      if (ctaPower < 40) {
        suggestions.push({
          category: "Призыв к действию",
          suggestion: "Усильте призыв к действию. Добавьте четкие инструкции: лайк, подписка, комментарий.",
          priority: "high" as const,
        });
      }
      
      if (context.platform === "tiktok" && !script.includes("#")) {
        suggestions.push({
          category: "Платформа",
          suggestion: "Для TikTok рекомендуется добавить хештеги для лучшего охвата.",
          priority: "medium" as const,
        });
      }
      
      // Общая оценка
      const validationScore = (
        (readabilityMetrics.word_count <= 90 ? 25 : 10) +
        (readabilityMetrics.avg_sentence_length <= 12 ? 25 : 10) +
        (viralPotential.overall_rating / 100 * 50)
      );
      
      logger?.info('✅ [ValidateScript] Script validation completed successfully');
      return {
        success: true,
        validation_score: Math.round(validationScore),
        optimization_suggestions: suggestions,
        readability_metrics: readabilityMetrics,
        viral_potential: viralPotential,
        message: `Валидация завершена. Оценка: ${Math.round(validationScore)}/100. Предложений: ${suggestions.length}`
      };
      
    } catch (error) {
      logger?.error('❌ [ValidateScript] Script validation error:', error);
      return {
        success: false,
        validation_score: 0,
        optimization_suggestions: [],
        readability_metrics: {
          word_count: 0,
          sentence_count: 0,
          avg_sentence_length: 0,
          complexity_score: 0,
        },
        viral_potential: {
          hook_strength: 0,
          emotional_impact: 0,
          call_to_action_power: 0,
          overall_rating: 0,
        },
        message: `Ошибка валидации сценария: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});