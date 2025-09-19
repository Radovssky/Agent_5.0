#!/usr/bin/env node

// Скрипт для отправки тестового сообщения боту через Telegram API
import { config } from 'dotenv';
config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ID чата для тестирования (можно использовать свой)
const TEST_CHAT_ID = process.env.TEST_CHAT_ID || "123456789";

async function sendMessage(chatId, text) {
    try {
        console.log(`📤 Отправляю сообщение: "${text}"`);
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Сообщение успешно отправлено!');
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

async function main() {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN не установлен');
        process.exit(1);
    }

    console.log('🤖 Тестирую отправку сообщения боту...\n');

    // Тестовые сообщения для проверки функций агента
    const testMessages = [
        "👋 Привет! Можешь помочь найти трендовые видео?",
        "🎬 Найди мне популярные видео про кулинарию и готовку",
        "📈 Покажи трендовые ролики про путешествия в России",
        "✨ Сгенерируй мне сценарий видео про искусство фотографии"
    ];

    for (let i = 0; i < testMessages.length; i++) {
        console.log(`\n📋 Тест ${i + 1} из ${testMessages.length}:`);
        await sendMessage(TEST_CHAT_ID, testMessages[i]);
        
        if (i < testMessages.length - 1) {
            console.log('⏳ Жду 3 секунды...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log('\n🎯 Следующие шаги:');
    console.log('1. Проверьте логи сервера для отладки обработки сообщений');
    console.log('2. Убедитесь, что агент отвечает в чате Telegram');
    console.log('3. Проверьте работу поиска видео и генерации контента');
}

main();