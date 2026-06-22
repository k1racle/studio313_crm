# Studio 313

Веб-приложение для управления медиа-студией: задачи, онлайн-запись на услуги, клиентская база, хелпдеск и Telegram-бот для автоматического создания задач из новостей в чате.

## Возможности

- **Современный дизайн** — интерфейс в стиле современных CRM на Tailwind CSS.
- **Управление задачами** — Kanban-доска, Gantt-диаграмма, список, фильтры, поиск, вложения, комментарии.
- **Проекты** — группировка задач по проектам, доступ сотрудников только к своим проектам.
- **Онлайн-запись** — публичная страница и виджет для сайта с шахматкой/календарём.
- **Клиентская база** — хранение контактов и истории взаимодействий, поиск.
- **Хелпдеск** — тикеты из Telegram-бота, публичной формы, виджета и вручную; конвертация тикета в задачу.
- **Telegram-бот** — создаёт задачи для журналистов из новостей в групповом чате; привязка Telegram-аккаунта к профилю.
- **Оплата** — интеграция с Альфа-Банком, поддержка частичной оплаты записей.
- **Уведомления** — email и Telegram при назначении задач/тикетов.
- **Роли** — админ, руководитель, менеджер, журналист.

## Стек

- Backend: Django + Django REST Framework
- Frontend: React + Vite
- База данных: PostgreSQL
- Очередь: Redis + Celery
- Telegram-бот: python-telegram-bot
- Контейнеризация: Docker + docker-compose

## Быстрый старт (локально)

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd studio-task-manager

# 2. Скопировать переменные окружения
cp .env.example .env
# Отредактируйте .env, особенно SECRET_KEY и TELEGRAM_BOT_TOKEN

# 3. Запустить через Docker Compose
docker-compose up --build -d

# 4. Создать суперпользователя
docker-compose exec backend python manage.py createsuperuser
```

Приложение будет доступно по адресу `http://localhost`.

## Деплой через Portainer

1. Подключите ваш Git-репозиторий в Portainer как Stack.
2. Укажите переменные окружения в интерфейсе Portainer (скопируйте из `.env.example`).
3. Замените `ALLOWED_HOSTS` и `CORS_ALLOWED_ORIGINS` на ваш домен.
4. Запустите Stack.
5. Создайте суперпользователя через консоль контейнера `backend`.

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `SECRET_KEY` | Секретный ключ Django (минимум 50 символов) |
| `DEBUG` | Режим отладки (`True`/`False`) |
| `DB_NAME` | Имя базы данных PostgreSQL |
| `DB_USER` | Пользователь PostgreSQL |
| `DB_PASSWORD` | Пароль PostgreSQL |
| `REDIS_URL` | URL Redis (по умолчанию `redis://redis:6379/0`) |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота |
| `ALLOWED_HOSTS` | Список разрешённых хостов через запятую |
| `CORS_ALLOWED_ORIGINS` | Разрешённые источники CORS через запятую |

## Telegram-бот

1. Создайте бота через [@BotFather](https://t.me/BotFather) и получите токен.
2. Укажите токен в `TELEGRAM_BOT_TOKEN`.
3. Добавьте бота в групповой чат студии.
4. Бот автоматически создаёт задачи при появлении сообщений с ключевыми словами новостей.
5. Команда `/task <текст>` принудительно создаёт задачу из сообщения.
6. Личные сообщения боту превращаются в тикеты хелпдеска.

## Структура проекта

```
studio-task-manager/
├── backend/          # Django backend
├── frontend/         # React frontend
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

## Разработка

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
export DB_ENGINE=sqlite
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Лицензия

MIT
