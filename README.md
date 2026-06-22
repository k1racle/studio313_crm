# Studio 313

Веб-приложение для управления медиа-студией: задачи, онлайн-запись на услуги, клиентская база, хелпдеск, внутренний чат с голосовыми сообщениями и локальной транскрибацией, а также Telegram-бот для автоматического создания задач из новостей в чате.

## Возможности

- **Современный дизайн** — интерфейс в стиле современных CRM на Tailwind CSS.
- **Управление задачами** — Kanban-доска, Gantt-диаграмма, список, фильтры, поиск, вложения, комментарии.
- **Проекты** — группировка задач по проектам, доступ сотрудников только к своим проектам.
- **Онлайн-запись** — публичная страница и виджет для сайта с шахматкой/календарём.
- **Клиентская база** — хранение контактов и истории взаимодействий, поиск.
- **Хелпдеск** — тикеты из Telegram-бота, публичной формы, виджета и вручную; конвертация тикета в задачу.
- **Внутренний чат** — мгновенные сообщения, стикеры, файлы, голосовые сообщения с автоматической локальной транскрибацией.
- **Telegram-бот** — создаёт задачи для журналистов из новостей в групповом чате; привязка Telegram-аккаунта к профилю.
- **Оплата** — интеграция с Альфа-Банком, поддержка частичной оплаты записей.
- **Уведомления** — email и Telegram при назначении задач/тикетов.
- **Роли** — админ, руководитель, менеджер, журналист.

## Стек

- **Backend:** Django 4.2 + Django REST Framework + Channels/Daphne (WebSocket)
- **Frontend:** React 18 + Vite + Tailwind CSS
- **База данных:** PostgreSQL 15
- **Очередь/Кэш:** Redis 7 + Celery
- **Telegram-бот:** python-telegram-bot
- **Транскрибация голоса:** faster-whisper (локальная модель)
- **Контейнеризация:** Docker + docker-compose
- **Обратный прокси:** nginx

## Требования

- Docker 24+ и Docker Compose 2.20+
- 4 ГБ RAM минимум (рекомендуется 6+ ГБ при использовании whisper `small` и выше)
- ~10 ГБ свободного места на диске (образы + кэш модели whisper)

## Быстрый старт (локально)

```bash
# 1. Клонировать репозиторий
git clone https://github.com/k1racle/studio313_crm.git
cd studio313_crm

# 2. Скопировать переменные окружения
cp .env.example .env
# Отредактируйте .env, особенно SECRET_KEY и TELEGRAM_BOT_TOKEN

# 3. Собрать и запустить проект
docker-compose up --build -d

# 4. Создать суперпользователя
docker-compose exec backend python manage.py createsuperuser
```

Приложение будет доступно по адресу `http://localhost:7000` (порт задаётся переменной `NGINX_PORT`).

## Деплой через Portainer

Portainer позволяет развернуть проект прямо из Git-репозитория.

1. В Portainer перейдите в **Stacks** → **Add stack**.
2. Выберите **Repository**, укажите:
   - **Repository URL:** `https://github.com/k1racle/studio313_crm.git`
   - **Repository reference:** `refs/heads/main`
   - **Compose path:** `docker-compose.yml`
3. В секции **Environment variables** скопируйте все переменные из `.env.example` и заполните их.
   Обязательно замените:
   - `SECRET_KEY` — сгенерируйте случайный ключ минимум 50 символов.
   - `ALLOWED_HOSTS` — укажите ваш домен, например `studio.example.com`.
   - `CORS_ALLOWED_ORIGINS` — укажите URL вашего фронтенда, например `https://studio.example.com`.
   - `NGINX_PORT` — внешний порт приложения. Если 80 занят, используйте `7000`, `2000` или любой другой свободный.
4. Нажмите **Deploy the stack**.
5. После запуска откройте консоль контейнера `backend` и создайте суперпользователя:
   ```bash
   python manage.py createsuperuser
   ```

> **Примечание:** в `docker-compose.yml` используются именованные Docker volumes (`postgres_data`, `redis_data`, `static_files`, `media_files`, `whisper_cache`). Portainer создаст их автоматически при первом деплое.

## Переменные окружения

Копируйте из `.env.example` и заполните перед запуском.

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `SECRET_KEY` | Секретный ключ Django (минимум 50 символов) | — |
| `DEBUG` | Режим отладки (`True`/`False`) | `False` |
| `DB_NAME` | Имя базы данных PostgreSQL | `studio_db` |
| `DB_USER` | Пользователь PostgreSQL | `studio_user` |
| `DB_PASSWORD` | Пароль PostgreSQL | `studio_pass` |
| `REDIS_URL` | URL Redis | `redis://redis:6379/0` |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота | — |
| `ALLOWED_HOSTS` | Список разрешённых хостов через запятую | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Разрешённые источники CORS через запятую | `http://localhost,http://localhost:5173` |
| `NGINX_PORT` | Внешний порт nginx | `7000` |
| `EMAIL_BACKEND` | Бэкенд отправки email | `django.core.mail.backends.console.EmailBackend` |
| `EMAIL_HOST` | SMTP-хост | — |
| `EMAIL_PORT` | SMTP-порт | `587` |
| `EMAIL_HOST_USER` | Логин SMTP | — |
| `EMAIL_HOST_PASSWORD` | Пароль SMTP | — |
| `DEFAULT_FROM_EMAIL` | Email отправителя | `noreply@studio.local` |
| `WHISPER_MODEL` | Модель faster-whisper (`tiny`, `base`, `small`, `medium`, `large-v3`) | `base` |
| `ALFABANK_TEST_MODE` | Тестовый режим Альфа-Банка | `True` |
| `ALFABANK_USERNAME` | Логин Альфа-Банка | — |
| `ALFABANK_PASSWORD` | Пароль Альфа-Банка | — |
| `ALFABANK_TOKEN` | Токен Альфа-Банка | — |
| `ALFABANK_BASE_URL` | Базовый URL API Альфа-Банка | `https://pay.alfabank.ru/rest/` |

### Рекомендации по переменным

- `SECRET_KEY` должен быть длинным и случайным. Сгенерировать можно командой:
  ```bash
  openssl rand -base64 50
  ```
- Для production всегда устанавливайте `DEBUG=False`.
- `ALLOWED_HOSTS` и `CORS_ALLOWED_ORIGINS` обязательно обновите под ваш домен при деплое.
- `WHISPER_MODEL` влияет на качество и скорость транскрибации:
  - `tiny` — очень быстро, низкое качество
  - `base` — баланс скорости и качества (рекомендуется)
  - `small` — лучшее качество, но медленнее и требует больше RAM
  - `medium`/`large-v3` — высокое качество, требуют много ресурсов

## Первый запуск и настройка

### 1. Создание суперпользователя

После запуска создайте администратора:

```bash
docker-compose exec backend python manage.py createsuperuser
```

Введите логин, email и пароль.

### 2. Вход в систему

Откройте `http://localhost:7000` (или ваш домен с указанным портом), войдите под созданным суперпользователем.

### 3. Настройка профиля

В разделе **Профиль** можно указать имя, фамилию и загрузить аватар. Эти данные отображаются в меню и чате.

### 4. Создание сотрудников

Администратор и руководитель могут создавать пользователей в разделе **Пользователи** (через API `/api/auth/users/` или Django-админку `/admin/`).

## Использование

### Главная панель

- Сводка по задачам, проектам, клиентам и финансам.

### Задачи

- Kanban-доска, Gantt-диаграмма и список.
- Создание задач, назначение исполнителей, сроки, приоритеты, вложения, комментарии.

### Проекты

- Группировка задач по проектам.
- Доступ сотрудников только к своим проектам.

### Клиенты

- Клиентская база с контактами и историей взаимодействий.

### Запись

- Управление услугами и бронированиями.
- Публичная страница записи доступна по `/booking/`.

### Хелпдеск

- Тикеты из Telegram, публичной формы, виджета и вручную.
- Конвертация тикета в задачу.

### Чат

- Мгновенные сообщения между сотрудниками.
- Поддержка текста, стикеров, файлов и **голосовых сообщений**.
- Голосовые сообщения автоматически транскрибируются локальной моделью faster-whisper.

### Финансы и платежи

- Учёт платежей, интеграция с Альфа-Банком.

## Telegram-бот

### Настройка

1. Создайте бота через [@BotFather](https://t.me/BotFather) и получите токен.
2. Запишите токен в `.env`:
   ```bash
   TELEGRAM_BOT_TOKEN=your-token
   ```
3. Перезапустите сервис бота:
   ```bash
   docker-compose up -d bot
   ```
4. Добавьте бота в групповой чат студии.
5. Для получения уведомлений привяжите Telegram-аккаунт в профиле (раздел **Привязка Telegram**).

### Команды бота

- `/start`, `/help` — справка.
- `/task <текст>` — создать задачу из сообщения.
- `/link <код>` — привязать Telegram к профилю (код генерируется в профиле).

### Автоматические действия

- Сообщения в групповом чате с ключевыми словами новостей автоматически превращаются в задачи.
- Личные сообщения боту превращаются в тикеты хелпдеска.

## Голосовые сообщения и транскрибация

- В чате нажмите кнопку микрофона, удерживайте её для записи, отпустите для отправки.
- Голосовое сообщение сохраняется и отображается в чате как аудиоплеер.
- Celery-задача автоматически распознаёт речь локальной моделью faster-whisper.
- После распознавания текст появляется под аудиоплеером всем участникам чата через WebSocket.
- Модель скачивается при первой транскрибации и кэшируется в volume `whisper_cache`.

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

> При локальной разработке фронтенд доступен по `http://localhost:5173`, API — по `http://localhost:8000`.

## Структура проекта

```
studio313_crm/
├── backend/              # Django backend
│   ├── apps/             # Приложения Django
│   ├── config/           # Настройки проекта
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             # React frontend
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .env.example
└── README.md
```

## Обновление проекта

```bash
# Получить последние изменения
git pull origin main

# Пересобрать и перезапустить
docker-compose down
docker-compose up --build -d

# Применить миграции (выполняются автоматически при старте backend)
docker-compose exec backend python manage.py migrate
```

## Резервное копирование

### База данных

```bash
# Создать дамп
docker-compose exec db pg_dump -U studio_user studio_db > backup.sql

# Восстановить дамп
docker-compose exec -T db psql -U studio_user studio_db < backup.sql
```

### Медиафайлы

Медиафайлы хранятся в Docker volume `media_files`. Для бэкапа:

```bash
docker run --rm -v studio313_crm_media_files:/source -v $(pwd):/backup alpine tar czf /backup/media_backup.tar.gz -C /source .
```

## Устранение неполадок

### Приложение не открывается

```bash
docker-compose ps
docker-compose logs backend
docker-compose logs nginx
```

### Ошибки при первом запуске

Убедитесь, что все переменные окружения заполнены, особенно `SECRET_KEY`.

### Бот не запускается

Проверьте `TELEGRAM_BOT_TOKEN`:

```bash
docker-compose logs bot
```

### Транскрибация не работает

Проверьте логи Celery:

```bash
docker-compose logs -f celery
```

Убедитесь, что у контейнера есть доступ к интернету для первоначальной загрузки модели.

### Проблемы с кодировкой

Если при локальной разработке на Windows возникают проблемы с `LF`/`CRLF`, настройте Git:

```bash
git config --global core.autocrlf true
```

## Лицензия

MIT
