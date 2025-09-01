# ⚡ Быстрое исправление ошибки Root Directory

## ❌ Проблема
```
Корневой каталог службы "/opt/render/project/src/Crm" отсутствует
```

## ✅ Решение за 30 секунд

### В Render Dashboard:
1. **Root Directory**: оставьте **ПУСТЫМ** ⚠️
2. **Build Command**: `npm install`
3. **Start Command**: `node server.js`
4. **Сохраните и перезапустите**

## 🔍 Почему это происходит?

Render ищет папку `Crm` в неправильном месте. Лучше оставить Root Directory пустым.

## 📋 Правильные настройки

| Параметр | Значение |
|----------|----------|
| **Name** | `Crm-1` |
| **Environment** | `Node` |
| **Branch** | `main` |
| **Root Directory** | **ОСТАВЬТЕ ПУСТЫМ** |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |

## 🚀 После исправления

1. Сохраните настройки
2. Нажмите "Create Web Service"
3. Дождитесь завершения (5-10 минут)
4. Готово! 🎉

---

**Совет**: Если Root Directory пустой, Render автоматически найдет все файлы в корне репозитория.
