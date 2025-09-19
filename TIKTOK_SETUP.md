# TikTok Official API Setup Guide

## Замена TikTok API завершена! ✅

Система теперь использует **официальный TikTok for Developers API** с токенами на 24 часа вместо неофициального API с токенами на 10 секунд.

## Что изменилось:

### ✅ **Стабильные токены**: 24 часа вместо 10 секунд
### ✅ **Автоматическое обновление**: Refresh tokens для непрерывной работы  
### ✅ **Официальная поддержка**: TikTok for Developers API
### ✅ **Больше данных**: Полная статистика видео (просмотры, лайки, комментарии)

## Настройка (требуется для работы):

### 1. Регистрация в TikTok for Developers

1. Перейдите на https://developers.tiktok.com/
2. Создайте аккаунт разработчика  
3. Создайте новое приложение
4. Получите Client Key и Client Secret

### 2. Переменные окружения

Добавьте в файл `.env`:

```env
# TikTok Official API (заменяет TIKTOK_COOKIE)
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here  
TIKTOK_REDIRECT_URI=http://localhost:8080/auth/tiktok/callback

# Старые переменные больше не нужны:
# TIKTOK_COOKIE=... (можно удалить)
```

### 3. OAuth Authorization Flow

При первом запуске пользователю нужно будет:

1. Перейти по ссылке авторизации TikTok
2. Разрешить доступ к данным
3. Система автоматически получит токены и будет их обновлять

## Преимущества нового API:

- 🔒 **Безопасность**: OAuth 2.0 вместо cookie
- ⏰ **Стабильность**: Токены живут 24 часа  
- 🔄 **Автообновление**: Refresh tokens
- 📊 **Больше данных**: Полная статистика
- 🚀 **Производительность**: Меньше ошибок соединения

## Техническая реализация:

- `src/lib/tiktokTokenManager.ts` - Управление токенами
- `src/lib/officialTikTokSearch.ts` - Официальный API поиска
- `src/mastra/tools/videoSearchTools.ts` - Интеграция в систему

## Обратная совместимость:

Старый API сохранен как `legacyTiktokSearchTool` для экстренных случаев, но **не используется** агентом по умолчанию.