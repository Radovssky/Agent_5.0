#!/usr/bin/env node

// Отправляем ответ пользователю через Telegram API
import { config } from 'dotenv';
config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const USER_CHAT_ID = "277779685"; // ID пользователя из логов

async function sendWelcomeMessage() {
    try {
        console.log('📤 Отправляю приветственное сообщение...');
        
        const message = `👋 Привет! Я твой Video Content Agent!

🎬 Я помогу тебе:
• Найти трендовые видео в YouTube, TikTok, Instagram  
• Проанализировать популярный контент
• Создать оригинальные сценарии на русском языке

💬 Попробуй написать:
"Найди трендовые видео про кулинарию"
"Создай сценарий видео про путешествия"
"Покажи популярные ролики про фитнес"

🚀 Готов к работе!`;

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: USER_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Приветственное сообщение отправлено!');
            console.log('📝 ID сообщения:', result.result.message_id);
            return result.result;
        } else {
            console.error('❌ Ошибка отправки:', result.description);
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error.message);
        return null;
    }
}

sendWelcomeMessage();