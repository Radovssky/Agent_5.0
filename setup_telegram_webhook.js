#!/usr/bin/env node

// Скрипт для настройки Telegram webhook
import { config } from 'dotenv';
config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
    process.exit(1);
}

// Получаем URL из переменных Replit
const webhookUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : null;

console.log('🔍 Получен Replit URL:', webhookUrl);

if (!webhookUrl) {
    console.log('⚠️  URL проекта не найден автоматически.');
    console.log('📝 Пожалуйста, настройте webhook вручную:');
    console.log('1. Откройте бота @BotFather в Telegram');
    console.log('2. Отправьте команду: /setwebhook');
    console.log('3. Отправьте URL: https://ВАШ-ПРОЕКТ.replit.dev/webhooks/telegram/action');
    console.log('   (замените ВАШ-ПРОЕКТ на реальное название проекта)');
    process.exit(0);
}

const fullWebhookUrl = `${webhookUrl}/webhooks/telegram/action`;

async function setupWebhook() {
    try {
        console.log('🚀 Настраиваю webhook для Telegram...');
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: fullWebhookUrl
            })
        });

        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Webhook успешно настроен!');
            console.log('🌐 URL:', fullWebhookUrl);
            console.log('📱 Теперь бот готов к работе!');
        } else {
            console.error('❌ Ошибка настройки webhook:', result.description);
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error.message);
    }
}

setupWebhook();