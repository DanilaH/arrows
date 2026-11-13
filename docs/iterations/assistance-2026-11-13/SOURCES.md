# Источники, база и границы доказательств

Дата проверки: 13.11.2026. Проверены source code и публичные первичные документы. Нет доступа к фактическим денежным кабинетам, новой физической телефонной сессии или подтверждённой финансовой отчётности конкурентов.

## 1. Приоритет требований

1. Последние явные решения владельца и актуальная рабочая версия проекта.
2. Этот пакет: `TASK.md` определяет объём и правила; `MEASUREMENT.md` - награды/рекламу/измерение; `FEEL.md` - представление. `ACCEPTANCE.md` проверяет эти контракты.
3. Действующие проектные документы; исторические запреты прежних релизов не отменяют новые явно описанные A2/A3/A4/B1.
4. Закреплённые runtime API и выбранные исследования.
5. Внешние примеры и демонстрационный эскиз - источники идей с ограниченной доказательностью.

Если найдено содержательное противоречие, установи конкретный затронутый контракт, продолжай независимые части работы и сообщи о нём. Не трактуй общую фразу «улучшить монетизацию» как право менять произвольные правила.

## 2. Проверенная версия Arrows

Remote main повторно сверён через Git: `ad4bc416aa26e6bbc257875675a428c281564ff9`. `package.json` на main: 0.19.1. Android code 31 указан действующим handoff.

База: https://github.com/DanilaH/arrows/tree/ad4bc416aa26e6bbc257875675a428c281564ff9

| Источник | Что подтверждает |
| --- | --- |
| [AGENTS.md](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/AGENTS.md) | Платформа, frozen identities, сохранения, доказательства сборки, рамки guidance/runtime |
| [HANDOFF.md](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/docs/HANDOFF.md) и [PROJECT_DECISIONS.md](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/docs/PROJECT_DECISIONS.md) | Последние 0.19.0/0.19.1, совместимый playtest, мягкие границы, принятый feel |
| [board.ts](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/src/domain/board.ts) | canExit, монотонность удаления, первая свободная подсказка, marked auto closure |
| [save.ts](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/src/progression/save.ts) | Попытки, Hint/continue, receipts, reservedRewards, один free gift |
| [adCadence.ts](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/src/progression/adCadence.ts) | Защита по победам и активному времени; запрос тоже обновляет guard |
| [surface.ts](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/src/game/surface.ts) | 3 активные секунды, целевой hint до использования, post-ad/foreground presentation |
| [BoardScene.ts](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/src/game/BoardScene.ts) | Статическая/динамическая геометрия, текущие цвета/толщина, stagger, камера, idle и reduced motion |
| [feedback.ts](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/src/platform/feedback.ts) и [sound.ts](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/src/platform/sound.ts) | Уже существующий pitch для быстрых удалений, voice ownership и физический характер обычного звука |
| [analytics-contract.json](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/src/platform/analytics-contract.json) | Единый точный контракт TS/native; не переносить диагнозы другого проекта |
| [ArrowsAdsPlugin.java](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/native/android/app/src/main/java/com/danilah/arrows/ArrowsAdsPlugin.java) | Cold rewarded load, interstitial preload, lifecycle, ImpressionData и earned authority |
| [arrows-platform.gradle](https://github.com/DanilaH/arrows/blob/ad4bc416aa26e6bbc257875675a428c281564ff9/native/android/arrows-platform.gradle) | Реальные SDK-зависимости и исключённый ad-revenue module |

## 3. Независимые структурные проверки

`proof/` содержит копию campaign.json, domain-исходники и переносимые проверки. `source-board.ts` и `source-geometry.ts` - снимки исходников. Рабочий `board.ts` отличается только `.ts` suffix в import для выполнения Node.

- Независимый Python-анализ проходит лучи по целым клеткам; не вызывает production canExit.
- Сравнены 217 586 пар потенциальных блокировок; воспроизведён 4 171 допустимый ход по выбранным полным траекториям.
- На 71 из 120 начальных полей есть свободный ход, открывающий больше новых обычных ходов, чем первая свободная стрелка.
- Проверены 824 коротких маршрута. Они не все укладываются в продуктовый лимит A3: реализация отдельно отбирает маршруты максимум из трёх ручных действий с учётом auto closure.
- Подробные состояния c20/c40/c120 находятся в `hint-examples.json`. Ошибки в части примеров намеренно выполнены для QA. Это не наблюдение частоты человеческих ошибок.
- A2-фикстура `cascade-fixture.json` и `verify-cascade.mjs` проверяют предложенное новое правило в изолированной модели. Успешная оркестрация текущих законных ходов не означает, что механизм уже внедрён в приложение.

Воспроизведение из папки `proof`, Python 3 и Node 24:

```bash
python3 analyze.py
node --experimental-transform-types verify.mjs
node --experimental-transform-types examples.mjs
node --experimental-transform-types verify-cascade.mjs
```

Предупреждение Node о transform-types ожидаемо. Не использовать strip-only для TypeScript constructor parameter properties. Проверки можно адаптировать к штатному test runner проекта; старый снимок нужен как доказательство исследования, не для замены свежего domain-кода.

**Эти результаты доказывают геометрию и воспроизводимость, но не удовольствие, частоту спроса, удержание или рост дохода.**

## 4. Первичные внешние источники

| Источник | Применение | Ограничение |
| --- | --- | --- |
| [Yandex Ads: impression-level revenue](https://ads.yandex.com/helpcenter/en/dev/android/impression-level) | Доход, валюта, precision и сеть из impression callback | Не доказывает включение интеграции в конкретном кабинете и не является подтверждённой выплатой |
| [AppMetrica: Ads SDK integration](https://yandex.ru/support/appmetrica-io/en/common/ads-sdk-integration) | Проверка существующей автоматической передачи | Автоматический и ручной потоки нельзя складывать без устранения дублей |
| [Android: Haptics design principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles) | Синхронность отклика, сила по значимости, fallback и конечные сигналы | Телефонная оценка конкретных рисунков остаётся отдельной проверкой |
| [W3C CSS Color 4](https://www.w3.org/TR/2026/CRD-css-color-4-20261112/) | Перцептивная интерполяция цвета; Oklab/OKLCH как возможные инструменты | Candidate Recommendation; не требование тащить CSS color-mix в Phaser и не гарантия красоты любой пары цветов |
| [Lessmore Arrows, App Store](https://apps.apple.com/us/app/arrows-puzzle-escape/id6748397500) | Наличие Hint, защиты серии, global lives, Remove Ads в IAP-каталоге | Не правила текущего Android-оффера и не доказательство прибыльности |
| [Lessmore Arrows, Google Play](https://play.google.com/store/apps/details?id=com.ecffri.arrows) | Официальное описание близкой механики | В этом пакете нет новой установленной телефонной сессии конкурента |
| [Point Out, Google Play](https://play.google.com/store/apps/details?id=com.arrow.out) | Hint, Magic Wand, Rubber; прежнее имя Arrow Out | Точные эффекты и rewarded-условия нельзя выводить из названий |
| [Point Out, App Store](https://apps.apple.com/us/app/point-out-color-escape-puzzle/id6754243057) | Наличие bundles, coins, pass и других покупок | Покупки конкурента не входят автоматически в наш scope |
| [Point Out: Cozy Picnic](https://play.google.com/store/apps/eventdetails/4828185818813051520) | Пример связи уровней и ограниченного события | Не основание вводить собственную большую мету в первую итерацию |

Перед изменением SDK-интеграции разработчик проверяет документацию для **реально установленной** версии. Этот пакет не требует upgrade SDK/Phaser/Capacitor ради совпадения с текущей веб-страницей.

## 5. Рамка исследований mini-games-kit

Локальный `docs/kit-guidance/TASK_ROUTER.md` выбирает конкретные документы на ревизии guidance e238267. Для feel нужны `docs/PUZZLE_PRODUCTION.md` и experience/novelty research; для paid help - Android Ads и Durable Receipt; для вывода о деньгах - Game Economics и Small-Studio Experimentation. Для нового режима - Puzzle Design Operating Playbook и независимая проверка контента.

Runtime API проверяется отдельно на a932526. Наличие рецепта в новом guidance не означает наличие экспорта в установленном пакете.

## 6. Что не было проверено

- Финансовая выгрузка владельца, доходность отдельных офферов, реальные retention и объём аудитории.
- Телефонная плавность, субъективное качество нового аудио/вибрации и рекламный no-fill на живой аудитории.
- Новый покадровый разбор внешнего видео или точных premium-эффектов конкурентов.
- Концептуальный inline-эскиз из чата не является игровой сборкой. Его статическая геометрия и сценарий были авторскими; в этой среде browser renderer не запустился из-за ограничения socket, проверялась только локальная логика состояний. Не использовать его как визуальный эталон пиксель-в-пиксель или как готовый игровой компонент.

В ходе реализации источник каждой записи и степень проверки обозначаются явно: реальная production/test сборка, seeded QA, controlled SDK, браузер, эмулятор, физический Android. Ручной просмотр и автоматический прогон отвечают на разные вопросы.

