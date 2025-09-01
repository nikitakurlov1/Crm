# 🚀 Быстрый деплой на Render

## Шаг 1: Подготовка кода
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Шаг 2: Создание Web Service на Render

1. **Перейдите на [render.com](https://render.com)**
2. **Нажмите "New +" → "Web Service"**
3. **Подключите ваш GitHub репозиторий**

## Шаг 3: Настройки

### Основные параметры:
- **Name**: `Crm-1`
- **Environment**: `Node`
- **Branch**: `main`
- **Root Directory**: `Crm` (если деплоите из корня репозитория)
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

### Environment Variables:
| NAME | VALUE |
|------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `JWT_SECRET` | `your-super-secure-jwt-secret-key` |
| `DATABASE_URL` | `./crypto_data.db` |

### Instance Type:
- Выберите **Free** план для начала

## Шаг 4: Деплой
1. **Нажмите "Create Web Service"**
2. **Дождитесь завершения сборки** (5-10 минут)
3. **Ваш сайт будет доступен по URL**: `https://crm-1.onrender.com`

## ✅ Готово!

Ваш крипто-обменник теперь работает в интернете!

## 🔧 Если что-то пошло не так:

1. **Проверьте логи** в Render Dashboard
2. **Убедитесь что все переменные окружения установлены**
3. **Проверьте что порт 3000 доступен**

## 📱 После деплоя:

- Обновите URL в вашем приложении
- Протестируйте все функции
- Настройте кастомный домен если нужно
