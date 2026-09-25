# Relax.tj

Сайт для поиска мест отдыха в Таджикистане: регионы, категории, места с фото,
отзывы, избранное, списки путешествий и предложения новых мест от пользователей.

- **Бэкенд:** Django 6.1, Django REST Framework, SimpleJWT, django-filter, drf-yasg (Swagger).
- **Фронтенд:** React, Vite, Tailwind CSS, React Router — в папке `frontend/`.

## Запуск бэкенда

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed
python manage.py createsuperuser
python manage.py runserver
```

- Swagger: http://127.0.0.1:8000/swagger/
- ReDoc: http://127.0.0.1:8000/redoc/
- Админка: http://127.0.0.1:8000/admin/

`python manage.py seed` заполняет базу регионами, категориями, активностями и местами
(Искандеркуль, Семь озёр, Варзоб, Сарез и др.). Повторный запуск не создаёт дубликаты.
Команда также добавляет описания, адреса, «как добраться» и фото мест из `places/seed_photos/`
(авторы и лицензии — в `places/seed_photos/CREDITS.md`).

## Запуск фронтенда

Нужен Node.js 20+.

```bash
cd frontend
npm install
npm run dev
```

`npm run dev` запускает сразу оба сервера — Django (порт 8000) и React (порт 5173) — в одном окне.
Только фронтенд: `npm run dev:react`, только бэкенд: `npm run dev:django`.

Сайт откроется на http://localhost:5173. Vite перенаправляет запросы `/api` и `/media`
на Django, поэтому отдельная настройка CORS для разработки не нужна.

Страницы:

- `/` — главная: места с фильтрами и поиском, места рядом (геолокация), категории,
  советы, открытые маршруты, окно места с отзывами и избранным.
- `/places/<id>` — страница места: фото, показатели, 3D-вид местности (CesiumJS:
  Cesium World Terrain и снимки Bing Maps Aerial через Cesium ion с солнечным освещением;
  используется демо-токен, встроенный в библиотеку — для настоящего сайта нужен свой бесплатный токен ion), карта и высота, подробности,
  что важно знать, что взять с собой, отзывы, избранное и добавление в маршрут.
- `/admin-panel` — панель управления для администраторов: статистика, проверка предложений
  мест, создание и редактирование мест с загрузкой фото, пользователи (роль, блокировка), модерация отзывов.
- `/profile` — профиль: мой маршрут с прогрессом посещения, сохранённые места,
  мои отзывы и предложения, настройки профиля и смена пароля.

Структура `frontend/src`:

| Папка / файл | Что внутри |
|---|---|
| `api.js` | Запросы к API с JWT и автообновлением токена |
| `context/` | `AuthContext` (пользователь), `UiContext` (окна и избранное), `ToastContext` |
| `pages/` | `Home.jsx`, `Profile.jsx` |
| `components/home/` | Разделы главной страницы |
| `components/place/` | Блоки страницы места и отзывы |
| `components/profile/` | Блоки страницы профиля |

## Переменные окружения (.env)

| Переменная | Описание | По умолчанию |
|---|---|---|
| `SECRET_KEY` | Секретный ключ Django | — |
| `DEBUG` | Режим отладки | `True` |
| `ALLOWED_HOSTS` | Хосты через запятую | `127.0.0.1,localhost` |
| `CORS_ALLOWED_ORIGINS` | Адреса фронтенда через запятую | `http://localhost:3000,http://localhost:5173` |
| `FRONTEND_URL` | Адрес фронтенда для ссылки в письме восстановления пароля | `http://localhost:5173` |

В режиме разработки письма не отправляются, а печатаются в консоли Django; ссылка для
восстановления пароля выводится отдельной строкой `[password reset] ...`.

## Роли

- **Гость** — просматривает регионы, места, отзывы и публичные списки.
- **Пользователь** (`role=user`) — отзывы, избранное, свои списки путешествий, предложения мест.
- **Админ** (`role=admin`) — управляет регионами, категориями, местами, фото, пользователями,
  одобряет или отклоняет предложения, видит статистику.

Авторизация: `Authorization: Bearer <access_token>`.

## Эндпоинты

### Аккаунт — `/api/auth/`

| Метод | URL | Описание |
|---|---|---|
| POST | `register/` | Регистрация, сразу возвращает токены |
| POST | `login/` | Вход (JWT) |
| POST | `token/refresh/` | Обновить access токен |
| POST | `logout/` | Выход (refresh токен в чёрный список) |
| GET, PUT, PATCH, DELETE | `profile/` | Свой профиль и статистика |
| POST | `change-password/` | Смена пароля |
| POST | `password-reset/` | Письмо со ссылкой для восстановления пароля |
| POST | `password-reset/confirm/` | Новый пароль по ссылке (`uid`, `token`, `new_password`) |
| GET, PUT, PATCH | `users/`, `users/{id}/` | Пользователи (только админ) |

### Места — `/api/`

| Метод | URL | Описание |
|---|---|---|
| CRUD | `regions/`, `categories/`, `activities/` | Справочники (изменение — админ) |
| GET | `regions/{id}/places/` (и для категорий, активностей) | Места региона / категории / активности |
| CRUD | `places/` | Места (изменение — админ) |
| GET | `places/top-rated/` | Лучшие по рейтингу |
| GET | `places/popular/` | Популярные по избранному |
| GET | `places/most-viewed/` | Самые просматриваемые |
| GET | `places/nearby/?lat=&lng=&radius=` | Места рядом, с `distance_km` |
| GET | `places/{id}/reviews/` | Отзывы места и сводка по звёздам |
| GET | `places/{id}/images/` | Фото места |
| GET | `places/{id}/similar/` | Похожие места |
| POST, DELETE | `places/{id}/favorite/` | Добавить / убрать из избранного |
| CRUD | `place-images/` | Фото (админ), `POST {id}/set-main/` — сделать главным |
| CRUD | `reviews/` | Отзывы, `GET my/` — мои отзывы |
| GET, POST, DELETE | `favorites/` | Моё избранное |
| CRUD | `travel-lists/` | Мои списки путешествий |
| GET | `travel-lists/public/` | Публичные списки |
| POST | `travel-lists/{id}/add-place/` | Добавить место в список |
| DELETE | `travel-lists/{id}/remove-place/{place_id}/` | Убрать место из списка |
| POST | `travel-lists/{id}/copy/` | Скопировать список себе |
| GET | `travel-lists/{id}/progress/` | Сколько мест посещено |
| CRUD | `travel-list-places/` | Места в списках, `POST {id}/toggle-visited/` |
| CRUD | `suggestions/` | Предложить новое место |
| POST | `suggestions/{id}/approve/`, `reject/` | Одобрить / отклонить (админ) |
| GET | `stats/` | Статистика (админ) |

### Фильтры мест

`region`, `category`, `activity`, `best_season`, `min_fee`, `max_fee`, `is_free`,
`min_altitude`, `max_altitude`, `min_rating`, поиск `?search=` и сортировка
`?ordering=` (`name`, `created_at`, `entrance_fee`, `altitude`, `views_count`,
`avg_rating`, `reviews_total`, `favorites_total`). Пагинация: `?page=` и `?page_size=`.

## Ограничения

- Лимит запросов: гости 1000/час, пользователи 5000/час, вход и регистрация 10/мин.
- Изображения: jpg, jpeg, png, webp, до 5 МБ.
