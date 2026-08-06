# Лиды (Telegram Worker)

Семейный сайт отправляет заявки в общий Cloudflare Worker **`psi-leads`**.

- Endpoint: `https://psi-leads.anna-shhe-adwords.workers.dev` (см. `assets/lead-tracking.js` → `PSI_LEADS_API`)
- Исходник Worker: репозиторий мужского сайта — `psikholog-dlya-muzhchin-rf/cloudflare/psi-leads-worker.js`
- В allowlist должны быть origin семейного сайта (unicode и punycode `.рф`)

## Источники на этом сайте

| Источник | `source` | Куда ведёт |
|----------|----------|------------|
| Онлайн-виджет записи | booking (виджет + thank-you) | `/thank-you-booking/` |
| Форма очной заявки | `callback` (`assets/callback-form.js`) | `/thank-you-callback/` |

## Деплой

Правки Worker делаются в мужском репо, затем **Deploy** в Cloudflare Dashboard для `psi-leads`. Локального wrangler в семейном репо нет.

## Цели аналитики (Метрика / GA)

Через `window.psiMetrikaGoal` (очередь в `consent-analytics.js` до согласия):

- `lead_booking`, `lead_callback`
- `click_telegram`, `click_whatsapp`, `click_max`, `click_phone`
- `open_booking`, `open_callback`
