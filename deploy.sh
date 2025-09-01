#!/bin/bash

# 🚀 Скрипт для быстрого деплоя на Render
# Использование: ./deploy.sh "Описание изменений"

echo "🚀 Начинаем деплой на Render..."

# Проверяем что описание изменений указано
if [ -z "$1" ]; then
    echo "❌ Ошибка: Укажите описание изменений"
    echo "Использование: ./deploy.sh 'Описание изменений'"
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "📝 Описание изменений: $COMMIT_MESSAGE"
echo ""

# Проверяем статус git
echo "🔍 Проверяем статус Git..."
git status

echo ""
echo "📦 Добавляем все изменения..."
git add .

echo "💾 Коммитим изменения..."
git commit -m "$COMMIT_MESSAGE"

echo "🚀 Пушим в GitHub..."
git push origin main

echo ""
echo "✅ Готово! Изменения отправлены в GitHub"
echo ""
echo "🔄 Render автоматически начнет деплой..."
echo "⏱️  Время ожидания: 5-10 минут"
echo ""
echo "📱 Проверить статус: https://dashboard.render.com"
echo "🌐 Ваш сайт: https://crm-1.onrender.com"
echo ""
echo "🎉 Деплой завершен! Ожидайте обновления сайта."
