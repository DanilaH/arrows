# Предрелизный аудит — 0.34.1 / code49

**Статус: BLOCKED_SAVE_CAPACITY. Выпускать в магазин пока рано.** Проверка переводов, метрик и release-пакета проведена; небольшие подтверждённые дефекты исправлены. Обнаружен отдельный блокер долгого прогресса: 55-я открываемая ежедневка превышает нативный лимит сохранения. Старое сохранение остаётся целым, но новая задача не записывается. Получение рекламных ID эту проблему не устраняет.

База: main63ac429 / приложениеdecbfaf,0.34.0-code48. Последний проверенный источник:6efbb270dffbe68c0d45f05221a56005f1c054f7. Новая версия0.34.1-code49. Сохранены более свежая работа, живущая эмблема и принятые UI/feel-решения. Полный протокол и контрольные суммы: [evidence/production-readiness-0341/ACCEPTANCE.md](evidence/production-readiness-0341/ACCEPTANCE.md).

## Что исправлено

| Проблема | Результат |
| --- | --- |
| Hard/Nightmare в русском Home, поле и календаре | Общие переводы «Сложный» / «Кошмар»; английские названия и смысловые цвета сохранены |
| Смена языка оставляет прежние document.lang/title | Метаданные следуют выбранному языку; переведён accessibility label загрузки, добавлено английское имя Android-приложения |
| «5 шага» и некорректные формы маршрутной помощи | Локальные форматтеры количества стрелок и шагов, включая родительный падеж после «до». Проверены0/1/2/4/5/11/14/21/22/25/101/111 |
| Обычный повторный вход в начатый уровень не даёт level_resume | Событие на явном входе в незавершённую начатую campaign/daily попытку; Settings/фон/нетронутое поле не создают новый старт |
| Время выхода/рестарта снимается до последней записи | Exit читает значение после своего сохранения; Restart передаёт старое время в transient SaveChange после успешного commit. Ожидающая/неуспешная запись не выдаётся за подтверждённую |
| Время запуска только в debug; нет контекста старого embedded уровня | Один startup_timing после реально открытого ready; attempt_context после первого подтверждённого действия: версия, сложность, число стрелок, стабильный attempt ID, без геометрии |
| Sender допускает неверные поля до runtime | Точные TS-типы генерируются из общего JSON, drift проверяется до компиляции. Реальный native-валидатор проверяется на всех38 схемах |
| Release не покрыт отдельной сборкой, подпись не настроена, shrinking выключен | Release-only web без лабораторий/технических controls; R8+resource shrinking, scoped bridge rules, явная production-подпись и отказ без live-конфигурации. Отдельный test-signed .releasecheck |
| Исключённый модуль AppMetrica8.6 ломает R8 | Восстановлена зависимость appsetid на той же версии SDK. Ошибки отсутствующих типов не подавлены через dontwarn или заглушки |

У AppMetrica остаются выключены advertising-ID/location tracking и native-crash reporting. AppSet SDK identity — отдельная возможность, теперь присутствующая в графе зависимостей: её фактическое поведение нужно учесть при проверке данных SDK. Yandex Ads добавляет AD_ID permission. Чистые custom payloads не означают отсутствия сбора данных всеми SDK.

## Блокер сохранений: воспроизводимый результат

На настоящих текущих dailyLevel для дат2026-01-01…2026-02-24 создан допустимый профиль после19 побед кампании: ежедневки открыты, геометрия не подменена, действия на них не сделаны. Native-бюджет взят из действующего ArrowsStoragePlugin, операция выполняется настоящим ProgressStore.openDaily через storage adapter с тем же UTF8-пределом.

| Факт | Значение |
| --- | --- |
| Нативный лимит одного значения | 4 194 304 байта |
| Записано ежедневок до отказа | 54 |
| Последний хороший профиль | 4 187 443 байта |
| Открытие55-й,2026-02-24 | 4 254 201 байт; подтверждённая ошибка write |
| Предыдущий raw-профиль и revision | Сохранены без изменений |
| Время воспроизводителя | 9 498 мс |

Это точная граница данного минимального тестового профиля, а не универсальный номер дня для всех игроков. Другой прогресс и помощь меняют размер. Пройденные ежедневки также остаются в архиве. Проверка не была физическим выполнением Java bridge на телефоне.

[CI44051537203 / release-audit](https://github.com/DanilaH/arrows/actions/runs/44051537203/job/133930316155) намеренно **FAIL** по реальному production gate. Reproducer сам завершился успешно; это не означает прохождение продуктовой приёмки. Полные55 измерений и исходная ошибка — [capacity.json](evidence/production-readiness-0341/capacity.json). Генераторы, поля и сохранения ради аудита не переписывались.

Следующий необходимый пакет — отделить растущий архив от постоянно перезаписываемого активного профиля. Перед реализацией выбрать формат хранения и атомарную границу: сохранить embedded геометрию/attempt IDs/историю ошибок/результаты/кубки/камеру, lifetime free continue и earned receipts; effect+dedup по-прежнему подтверждаются одной авторитетной транзакцией до ack. Миграция должна читать старый schema2 и переживать прерывания до/после записи и readback. Проверять год/два года архива, много незавершённых полей, pending receipt и провал записи. Простое повышение лимита оставляет рост полной сериализации и повторных записей; это не принято за решение. Большой рефактор хранения в этот аудит не включён.

## Метрики: что уже учитывается

Общий контракт38 событий, bounded transport32 outstanding. Состояния и награды сначала подтверждаются writer; SDK acceptance не равен доставке в кабинет. Нет поштучного лога каждого tap/кадра, нового outbox или повторного определения старых Hint-наград.

| Задача | Источник / смысл | Ограничение |
| --- | --- | --- |
| Installs, DAU/WAU/MAU, sessions, session duration, D1/D7 | Автоматическая AppMetrica activity/session tracking | Кабинет/export ещё не проверены; зафиксировать timezone и календарную либо24h-дефиницию retention |
| Запуск и первый доступный экран | app_ready, startup_timing | Время от JS-модуля, не полный OS cold start и не benchmark телефона |
| Туториал | tutorial_step после persisted completion | Показ подсказки не считается освоением |
| Воронка campaign/daily и сложность | level_start/context/error/complete/restart/exit/resume, attempt_final | Уникальные attempt, mode/id/content_version; фон/меню не равны окончательному уходу. Старые попытки не получают вымышленного backfill |
| Время и ошибки | Подтверждённые active_ms, mistakes, first/lives | Меню/фон/реклама исключены; незавершённые попытки учитывать как незавершённые, а не удалять из выборки |
| Возврат в daily и награды | daily_open/complete, collection_unlock, SDK session dates | Дата архивной задачи отличается от даты события |
| Предложение→выбор→запрос помощи | assistance_assignment/offer/choice/request | Эпизоды видимости и frozen offer; assignment/offer/request/attempt IDs, отдельные qa/native environment |
| Рекламная воронка / ожидание | ad_preload/event/session/result/opportunity | Различать load, invoke, show, impression, dismiss, earned; preload не получает фиктивного attempt |
| Earned→право→резерв/claim→использование | ad_reward_granted/reserved, assistance_fact | Ручные/native/bonus удаления разделены. hint_applied остаётся сохранённой подсветкой |
| Полезность помощи/продолжения | assistance_followup, continue_outcome | Один терминальный исход на право; анимация не считается действием. Free gift отдельно через continue_applied/source=free |
| Деньги, eCPM,7-дневная ценность eligible группы | Реальный SDK ILRD→ad_impression_value→session→assignment | Только release/live/production, dedup, валюты отдельно, отсутствующие суммы unknown. Автоматические SDK-итоги к тем же ILRD не прибавлять |
| Общий ARPU/ARPDAU, ROAS, LTV | Общий SDK denominator + доход сети; внешние attribution/spend и зрелые окна | Текущий cohort helper один этого не считает. Выручка, оценочный LTV и выплата различаются |
| Надёжность | save_error, sanitized runtime_error, analytics_health, Java crashes | Потери наблюдаются, но полнота доставки неизвестна; native crashes OFF, ANR NOT VERIFIED; нужен mapping для optimized crash reports |
| Производительность/feel | Имеющаяся диагностика + профиль целевого телефона | Физические FPS/frame pacing/memory/audio/haptics на финальном SDK-enabled release ещё NOT RUN |

Для нормальной текущей политики revenueCohorts вызывается с experimentId=assistance-combined-v1; исторический default assistance-v1 намеренно отделён. Знаменатель eligible-assigned installs не равен всем установкам. SDK installation/session ID и локальный helpLedger.installId не считаются одинаковыми: соединение проверяется на реальной выгрузке. Персональные данные, полные поля/сейвы, ключи и произвольные error strings в custom события не передаются.

## Что фактически проверено

| Проверка | Результат |
| --- | --- |
| Unit/type/build | 239 /30 файлов PASS |
| Финальные затронутые браузерные сценарии | 80/80 PASS,2.9мин |
| Полный браузерный прогон приложения673713c | 496/496 PASS,26.1мин; web133919531913 SUCCESS. Web source/assets после этого не менялись |
| Hosted release-web RU/EN, обе темы, малые экраны, synthetic150%, reduced motion, loss | 32 состояния /5 профилей /0 runtime errors; лабораторий нет. Не Android system-font scaling |
| JVM из скачанных XML | 21 /7 файлов,0 failures/errors |
| Android6efbb27 | debug + совместимая .playtest + optimized releaseCheck, sync, official payload checks PASS |
| .releasecheck | 5 408 972 байта; подписьV2, debuggable=false, portrait, zipalign16KB,15 web-файлов совпали;4 bridge classes/methods сохранены в итоговом DEX |
| Production без live-конфигурации | Сборка правильно отклонена |
| Публикация, настоящая production-подпись, live SDK/dashboard/money, физический телефон | NOT RUN |

ReleaseCheck — com.danilah.arrows.releasecheck с тестовой подписью, demo ads и пустым analytics key. Это не production APK и не пакет обновления .playtest. Последняя .playtest сохраняет com.danilah.arrows.playtest, code49, прежний проверенный сертификат, test ads / analytics OFF; реальная установка обновления на телефоне не выполнялась. Прогресс тестового пакета автоматически в production не переносится.

Предыдущая0.34 также проверена: CI44040646713 завершён SUCCESS,492 браузерных,234unit и оба native build; старый pending-статус закрыт. Текущий общий CI не объявляется зелёным: archive gate красный, последний повтор полного web ещё может идти. История исправленных observer/CI ошибок сохранена в evidence, не засчитана в PASS.

## Что потребуется после архива

| Назначение | Конфигурация |
| --- | --- |
| Rewarded | YANDEX_REWARDED_AD_UNIT_ID |
| Interstitial | YANDEX_INTERSTITIAL_AD_UNIT_ID |
| AppMetrica production app | APPMETRICA_API_KEY; отдельный debug app/key при необходимости внешнего smoke |
| Режим | ARROWS_AD_MODE=live |
| Production signing | ARROWS_RELEASE_KEYSTORE, ARROWS_RELEASE_STORE_PASSWORD, ARROWS_RELEASE_KEY_ALIAS, ARROWS_RELEASE_KEY_PASSWORD, ARROWS_RELEASE_CERT_SHA256 — через защищённую конфигурацию |
| Карточка магазина и mapping | RuStore listing identity, support/privacy URL, фактические данные/аудитория SDK, доступ к AppMetrica для mapping и выгрузок |
| Воспроизводимый cold build | Авторизованное чтение private mini-games-kit на точном pin; тёплый CI cache не заменяет постоянный read credential |

После исправления архива и конфигурации: настоящий signed/shrunk release, проверка fingerprint/hash/manifest/payload, install/update без очистки данных, offline/process interruption/Back/portrait, реальные rewarded/interstitial/возврат, события/export и crash mapping, замеры большого поля на телефоне. Предыдущая положительная оценка игры владельцем сохраняется; общий плейтест заново не назначается.

## Основание и KIT IMPACT

**KIT IMPACT: REUSE.** Применены Android Release Acceptance, Committed Analytics и Localization and Authentic Store Media: проверка точного optimized payload, TS/native parity, события после save и смысл перевода в контексте. Использованы существующие StartupTimeline, activity/transport/save seams. Новые generic API не потребовались; в kit ничего не пушилось, store не менялся.

Изученный kit:5a0836cbf562013201ec842376d7a84998f89e48 — API/task router/Arrows index и указанные playbooks. Runtime pin a9325265e87583a4872cf6a158e1e881a0d7508e и consumer guidance e04a3fe87ca93d506e01df4acc5afe690408cefa сохранены. Из исследований SELECT — конкретная проверка релиза/семантики/контракта; HOLD — durable analytics outbox, новые SDK/ANR/эксперименты без доказанной необходимости; REJECT — смешение debug, device, dashboard и paid delivery в один статус.

Первичные внешние источники, проверены2026-11-17:

- https://github.com/DanilaH/mini-games-kit/blob/5a0836cbf562013201ec842376d7a84998f89e48/docs/ANDROID_RELEASE_ACCEPTANCE.md
- https://github.com/DanilaH/mini-games-kit/blob/5a0836cbf562013201ec842376d7a84998f89e48/docs/platform/COMMITTED_ANALYTICS.md
- https://github.com/DanilaH/mini-games-kit/blob/5a0836cbf562013201ec842376d7a84998f89e48/docs/LOCALIZATION_AND_STORE_MEDIA.md
- https://developer.android.com/topic/performance/app-optimization/enable-app-optimization
- https://ads.yandex.com/helpcenter/en/monetization/ad-unit/rewarded
- https://appmetrica.yandex.ru/docs/en/data-collection/basic-events
- https://appmetrica.yandex.ru/docs/en/mobile-api/logs/endpoints
- https://appmetrica.yandex.ru/docs/en/data-collection/upload-mapping
- https://github.com/appmetrica/appmetrica-sdk-android/blob/v8.6.0/analytics/src/main/java/io/appmetrica/analytics/impl/id/AppSetIdGetter.kt
- https://github.com/appmetrica/appmetrica-sdk-android/blob/v8.6.0/appsetid/README.MD

Текущий общий SDK module guide называет appsetid optional, но точный pinned R8 выдаёт missing types; source tag содержит прямые type references и required-module README. Generated API dump внутри тега указывает8.7 и не используется как доказательство бинарного8.6. Решение принято по фактическому Gradle/R8 и исходнику, без blanket dontwarn.
