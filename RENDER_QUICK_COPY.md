# 📋 Быстрое копирование настроек для Render

## 🚀 Основные настройки

**Name**: `Crm-1`
**Environment**: `Node`
**Branch**: `main`
**Root Directory**: `Crm` ⚠️ ВАЖНО! (или оставьте пустым)
**Build Command**: `npm install`
**Start Command**: `node server.js`

## 🔧 Environment Variables

| NAME | VALUE |
|------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | `your-super-secure-jwt-secret-key-change-this` |
| `DATABASE_URL` | `./crypto_data.db` |

## 📁 Структура проекта

```
Crm/
├── server.js          ← Основной сервер
├── package.json       ← Зависимости
├── database.js        ← База данных
├── public/            ← Статические файлы
└── init-*.js         ← Скрипты инициализации
```

## ⚡ Быстрый старт

1. **Скопируйте настройки выше**
2. **Установите Root Directory как `Crm`**
3. **Добавьте Environment Variables**
4. **Нажмите "Create Web Service"**
5. **Дождитесь завершения (5-10 минут)**

## 🔍 Проверка

После деплоя ваш сайт будет доступен по адресу:
`https://crm-1.onrender.com`

## ❗ Важно помнить

- **Root Directory ДОЛЖЕН быть `Crm`**
- **Порт должен быть `3000`**
- **JWT_SECRET должен быть уникальным**
- **База данных создастся автоматически**
