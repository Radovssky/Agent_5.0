#!/usr/bin/env node

// Скрипт для тестирования Telegram бота
import { config } from 'dotenv';
config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const REPLIT_URL = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : null;

if (!TELEGRAM_BOT_TOKEN || !REPLIT_URL) {
    console.error('❌ Не найдены необходимые переменные окружения');
    process.exit(1);
}

// Получаем информацию о боте
async function getBotInfo() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
        const result = await response.json();
        
        if (result.ok) {
            console.log('🤖 Информация о боте:');
            console.log('   Имя:', result.result.first_name);
            console.log('   Username: @' + result.result.username);
            console.log('   ID:', result.result.id);
            return result.result;
        } else {
            console.error('❌ Ошибка получения информации о боте:', result.description);
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error.message);
        return null;
    }
}

// Тестируем webhook endpoint
async function testWebhook() {
    try {
        console.log('\n🔍 Тестирую webhook endpoint...');
        const testPayload = {
            update_id: 123456789,
            message: {
                message_id: 1,
                from: {
                    id: 123456789,
                    is_bot: false,
                    first_name: "Test",
                    username: "testuser"
                },
                chat: {
                    id: 123456789,
                    first_name: "Test",
                    username: "testuser",
                    type: "private"
                },
                date: Math.floor(Date.now() / 1000),
                text: "Привет! Найди мне трендовые видео про кулинарию"
            }
        };

        const response = await fetch(`${REPLIT_URL}/webhooks/telegram/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });

        console.log('📡 Статус ответа:', response.status);
        console.log('📡 Headers:', [...response.headers.entries()]);
        
        if (response.ok) {
            console.log('✅ Webhook endpoint доступен и отвечает!');
        } else {
            console.log('⚠️ Webhook endpoint вернул ошибку');
        }
        
    } catch (error) {
        console.error('❌ Ошибка тестирования webhook:', error.message);
    }
}

// Получаем обновления от бота (для проверки работы)
async function getUpdates() {
    try {
        console.log('\n📨 Проверяю последние сообщения боту...');
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
        const result = await response.json();
        
        if (result.ok && result.result.length > 0) {
            console.log('📬 Найдено сообщений:', result.result.length);
            result.result.slice(-3).forEach((update, index) => {
                console.log(`   ${index + 1}. От ${update.message?.from?.first_name || 'Неизвестно'}: "${update.message?.text || 'Не текст'}" (${new Date(update.message?.date * 1000).toLocaleString('ru-RU')})`);
            });
        } else {
            console.log('📭 Сообщений не найдено');
        }
    } catch (error) {
        console.error('❌ Ошибка получения обновлений:', error.message);
    }
}

async function main() {
    console.log('🚀 Начинаю тестирование Telegram бота...\n');
    
    const botInfo = await getBotInfo();
    if (!botInfo) {
        process.exit(1);
    }

    await testWebhook();
    await getUpdates();
    
    console.log('\n🎯 Следующие шаги:');
    console.log('1. Откройте Telegram и найдите бота: @' + botInfo.username);
    console.log('2. Отправьте команду: /start');
    console.log('3. Попробуйте запрос: "Найди мне трендовые видео про путешествия"');
    console.log('4. Проверьте логи сервера для отладки');
}

main();