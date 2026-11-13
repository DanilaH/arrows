# Arrows → mini-games-kit: аудит перед переносом

Дата: 2026-11-13. Статус: исследование и предложения; runtime не изменён, extraction не выполнен.

## Проверенные версии и границы

- Arrows: `e535fe48474456410c49be24b45a6b9e024e8cba`, 0.19.0 / Android code30. Прочитаны актуальный HANDOFF, решения, отчёты 0.17–0.19, соответствующие реализации и регрессии.
- Установленный runtime kit в Arrows: `a9325265e87583a4872cf6a158e1e881a0d7508e`. Guidance snapshot: `e2382670fbd5c2aa76462fea688c60de2b067392`. Это разные зависимости; аудит не обновляет ни одну.
- Сравнение с текущим kit: `f154e0b537e395309763e0dd6514725c7196f690`. Проверены Public API и относящиеся к задаче layout, haptics, touch activation, presentation skip, startup/renderer, performance, release и puzzle-production contracts. Это не аудит всего SDK.
- Для происхождения баннерного и haptic-рецептов дополнительно прочитан `DanilaH/seeds-bits@4f7a8f93e044cc5eb5f4dadceb8a0458b555cf08`: monetization, haptics, native feedback, main, статус и banner-layout report.

Основной результат: полезнее дополнить существующие рецепты доказанными сбоями и регрессиями, чем сразу выносить игровые классы в новые общие API.

## Что с баннером

Нужно различать две вещи:

1. **Рекламный баннер.** В проверенном Arrows его нет: согласован rewarded + interstitial без banner. Это явно записано в [KIT_REUSE](KIT_REUSE.md), [NATIVE_PLATFORM](NATIVE_PLATFORM.md) и release/spec документах; в native ads plugin баннерного пути нет. История Arrows не даёт основания приписывать ему свежую баннерную extraction.
2. **Игровая плашка открытия режимов.** В 0.19 появились уведомления Collection/daily непосредственно на c10/c20: `gameUnlock` в [uiMotion.ts](../src/game/uiMotion.ts), вызов и durable seen claim в [meta.ts](../src/game/meta.ts). Это реальная недавняя доработка, но её сроки открытия, тексты, иконки и сохранённые claims принадлежат игре.

В kit **уже есть** [native banner placement](https://github.com/DanilaH/mini-games-kit/blob/f154e0b537e395309763e0dd6514725c7196f690/docs/layout/NATIVE_BANNER_PLACEMENT.md):

- `resolveNativeSafeAreaCss` и `resolveNativeBannerPlacement` в `/layout`;
- перевод CSS→native по ширине WebView, четыре safe edges, inward rounding, offsets/padding;
- фактическая высота SDK на текущей ширине, результат `reserve` с обязательным повторным измерением, скрытие некорректной геометрии;
- recipe для generation, rotation/resize и отбрасывания устаревших callbacks; стабильная поверхность loading/no-fill;
- регрессия Water Sort: 1080×2400 native / 392×872 CSS / bottom130 требует **49 CSS px**, а не48. Есть независимый Java↔TS consumer probe.

Происхождение уже учтено в kit: placement из Sudoku Doku, обратный safe-area расчёт из Water Sort. В Seeds ранее реализована передача `bannerSize` в CSS; описаны shelf72/60, gap16 и перерасчёт при повороте. Это не доказательство новой универсальной политики компактного слота.

**Фактическая граница:** placement размещает рекламу внутри переданного слота. Если слот слишком высок, он центрирует рекламу, а не уменьшает DOM-резерв. Загрузка, no-fill и решение об освобождении места остаются у consumer. Новое автоматическое уменьшение/схлопывание — **HOLD**, пока нет точного donor patch и проверенного поведения при loading, no-fill, rotation и позднем callback. Это не обнаруженный баг placement и не повод менять его совместимый контракт.

## Приоритеты

| Приоритет | Тема | Что уже есть в kit | Реальный недостающий результат | Решение / стоимость |
| --- | --- | --- | --- | --- |
| P1 | Числа и отмена native haptics | Epoch/freshness/priority/capability recipe | JSON Integer/Long trap, безопасный integer decoder, same-ms cancel case | SELECT / IMPROVE рецепта; малая |
| P1 | Владение переходами | Actual first frame, final paint, WAAPI/background guidance | Snapshot fade disposal, synchronous wake ordering, конечное владение DOM/таймерами | SELECT / IMPROVE рецепта; малая–средняя |
| P2 | Большие поля Phaser4.2.1 | Dirty layers, bounded caches, paired profiling | Graphics/retained geometry case; Blitter scale и Canvas pixel regression | SELECT / IMPROVE примера/проверок; средняя |
| P2 | Тестовые APK и медиа | Signing, identity, actual payload, separate playtest already required | Stable test-certificate cache trap, compiled native config, реальный audio capture | SELECT / точечное дополнение; малая–средняя |
| P3 | Отзыв кнопок и игровые уведомления | Touch activation и presentation skip | Опциональный пример конечного press/notice ownership | CANDIDATE; новый runtime пока HOLD |
| — | Баннерная геометрия | Уже реализована и проверяется | Не дублировать; уточнить границу placement/slot policy | REUSE существующего; compact controller HOLD |
| — | Версионирование будущих daily | Content/save/attempt identity и immutable daily уже описаны | Возможно, пример effective-date границы и golden fixtures | HOLD отдельного экспорта |

Стоимость относительная: малая — локальный рецепт и пример регрессии; средняя — воспроизводимый пример с несколькими состояниями/рендерерами. Это не оценка времени физической приёмки.

### P1. Native haptics: числовой протокол

**Доказательство в Arrows:** [ArrowsFeedbackPlugin.java](../native/android/app/src/main/java/com/danilah/arrows/ArrowsFeedbackPlugin.java), [FeedbackCounterTest.java](../native/android/app/src/test/java/com/danilah/arrows/FeedbackCounterTest.java), [PHONE_FEEDBACK](PHONE_FEEDBACK.md).

В установленном Capacitor Android8.6.0 `PluginCall.getLong` принимает только `Long`. Реальный JSON `{"generation":1,"issuedAt":1794470000123}` даёт `Integer` для generation и `Long` для timestamp. Поэтому корректный маленький JS-счётчик может исчезнуть на native стороне, хотя TS/mock проверки зелёные. Arrows читает `Number` через `opt` и проверяет конечность, неотрицательность, целочисленность и диапазон JS safe integer.

В обычном `cancel` нельзя подменять generation барьером `issuedAt <= currentTimeMillis`: новый разрешённый импульс в ту же миллисекунду тоже будет отброшен. При pause/destroy нужны самостоятельные invalidation/freshness правила.

**Предлагаемая доработка:** дополнить `docs/android/HAPTICS.md` проверяемым Java-фрагментом и JSON fixture; явно отделить transport decoding, generation и freshness. Сохранить более полный configure/equality/priority протокол текущего kit. Не копировать упрощённый Arrows plugin целиком.

**Важная проверка против ложного вывода:** в прочитанном Seeds native действительно используется `getLong("epoch")`, но JS формирует epoch как `Math.max(Date.now(), epoch + 1)`. Сейчас это большое значение, а не счётчик1. Seeds нельзя объявлять сломанным только по совпадению имени метода. Рецепт должен предупреждать о смене представления epoch на маленький счётчик.

**Приёмка:** Integer0/1, Long timestamp, целый Double; отказ для null/string/negative/fraction/NaN/Infinity/>2^53−1. Reorder старой конфигурации/импульса, новый разрешённый same-ms pulse после cancel, background/resume. Проверять реальный JSON, не только вручную созданный Long. Физическая сила/ритм — отдельный phone check.

### P1. Переходы: ownership, actual frame, reentrancy

**Доказательство:** [SEAMLESS_ENTRY](SEAMLESS_ENTRY.md), [boardTransition.ts](../src/game/boardTransition.ts), [uiMotion.ts](../src/game/uiMotion.ts), [seamlessEntry.spec.ts](../tests/browser/seamlessEntry.spec.ts), [uiMotion.spec.ts](../tests/browser/uiMotion.spec.ts).

Реальные исправленные сбои: cancel WAAPI с `fill:'both'` возвращал исходную opacity ещё подключённого snapshot и давал вспышку; переименование ID теряло размеры из ID-scoped CSS; wake мог синхронно выдать POST_RENDER до установки cleanup/owner, оставляя busy lock; измерение анимированного rect добавляло сдвиг камеры.

**Предлагаемая доработка:** focused recipe и regression example: owner/cleanup до wake; snapshot удаляется по завершении собственного fade; размеры сохраняются до смены ID; layout coordinates отделены от анимированной презентации. Все конечные animations/timers/nodes/listeners отменяются на навигации, dialog, resize, background и dispose; reduced motion приходит в тот же конечный state.

**Приёмка:** synchronous callback harness, повторные вход/выход, cancel в середине fade, background/resize, reduced motion и завершение ровно один раз. Проверять disconnected snapshot и снятый lock, а не только отсутствие исключений.

Новый `AnimationOwner` — CANDIDATE до второго независимого consumer с совпадающими гарантиями. Не выносить SVG→canvas arrow bridge, селекторы всей игры или универсальный route manager.

### P2. Производительность: сохранить изображение при оптимизации

**Доказательство:** [PHONE_FEEL_V2](PHONE_FEEL_V2.md), [stableArrowBatch.ts](../src/game/stableArrowBatch.ts), [phone-rendering-profile.mjs](../tools/audit/phone-rendering-profile.mjs), [verification JSON](verification/PHONE_FEEL_V2_BUILD_2026-11-13.json).

Arrows сократил повторную Graphics/triangulation работу retained Mesh2D для стабильной геометрии и маленьким dot atlas. У Phaser4.2.1 Blitter игнорировал собственный scale, поэтому scale перенесён на parent. Реальные Canvas screenshots обнаружили другое поведение camera-scroll/atlas coordinates: Canvas оставлен на Graphics. Первый быстрый прототип потерял точки; такой результат нельзя засчитывать как ускорение.

**Предлагаемая доработка:** добавить конкретный engine/backend case в performance recipe и минимальный пример с видимыми контрольными пикселями, dirty redraw и lifecycle. Не делать общий arrow renderer или автоматически переводить другие игры на Mesh.

**Приёмка:** одинаковые поля/жесты/viewport/DPR, WebGL и forced Canvas, светлая/тёмная темы, zoom/resize, реальная видимость точек/контрольных углов, финальный paint и idle/dispose. CPU4x/CDP результаты — браузерная диагностика, не FPS телефона. RGBA proxy двух маленьких atlas не включает driver/buffer overhead.

### P2. Доставка APK и звук в доказательствах

**Доказательство:** [PHONE_FEEDBACK](PHONE_FEEDBACK.md), [PHONE_FEEL_V2 verification](verification/PHONE_FEEL_V2_BUILD_2026-11-13.json), [capture-phone-feel-v2-gifs.mjs](../tools/capture-phone-feel-v2-gifs.mjs).

Текущий kit уже требует сверять delivered APK, signer, embedded web payload и отдельный playtest appId. Нужны узкие дополнения: наличие debug-keystore cache не гарантирует одного signer; stable workspace signing key проверяется по фактическому сертификату APK. Отдельно доказывается update поверх предыдущего playtest, без предложения удалить данные.

Конфигурацию следует сверять в скомпилированном native payload, а не по случайному присутствию строки. Exact web payload включает шрифты и лицензии. GIF немой: для проверки звука Arrows захватывает реальный AudioContext output в MP4, без подложенного аудио и подставленного прогресса.

**Приёмка:** cold/warm cache и два последовательных APK с одинаковым сертификатом и растущим code; явное разделение fresh install/update. Проверка compiled config + hashes delivered assets. Короткий MP4 с настоящими действиями/аудио. Не создавать ещё один Android bootstrap или APK parser: границы официальных инструментов и существующих recipes сохраняются.

## Кандидаты, которые пока остаются локальными

- **Press feedback:** нажатие даёт немедленный визуальный ответ, отпускание/движение/scroll/pointercancel/background снимают состояние; reduced motion сохраняет читаемый статический press. Полезен opt-in пример, а не глобальный installer. `installTouchActivation` уже решает другую задачу — корректную активацию DOM после captured gestures; не смешивать её со стилями, звуком и вызовом действия на pointerdown.
- **Игровые плашки:** конечное владение и `role=status` могут войти в тот же motion recipe. Решение, когда считать уведомление увиденным, persistence, c10/c20 и игровые иконки остаются в Arrows. Для общего notice API пока один реальный consumer.
- **Daily:** [AUTONOMOUS_DAILY](AUTONOMOUS_DAILY.md) даёт frozen2026, versioned generation с2027, effective-date boundary, golden fixtures и сохранение старых embedded attempts. Kit уже описывает неизменность daily при upgrade. Можно позднее добавить маленький пример границы версий; генератор стрелок и календарную экономику не извлекать. Новые calendar/hint primitives текущего kit не означают, что они доступны в старом runtime pin Arrows.

## Порядок следующей работы

1. **Небольшой первый пакет в kit:** haptics numeric/cancel recipe + owned-transition regression recipe. Provenance, ограничение гарантий и проверяемые fixtures обязательны. Дополнительно явно указать в banner docs, что `place` не обещает минимальную высоту DOM-резерва; не менять API/slot policy.
2. **Отдельный пакет:** Phaser backend/performance example и небольшие уточнения release/audio evidence. Сначала сохранить воспроизведение, затем обобщать код только при доказанной общей потребности.
3. **Только после этого выбирать runtime extraction:** finite animation ownership/press/notice — по второму consumer или отдельному архитектурному решению владельца. Никаких автоматических upgrades всех игр; каждый consumer сохраняет pin и получает отдельную проверку миграции.

Не включать в перенос: генерацию/баланс уровней, auto-release ошибочных стрелок, camera/arc-length правила, один lifetime free refill, суммы наград/жизни, Hint3s, ad cadence, палитру/иконки/шрифт/тембр/FX. Успешная локальная фича не делает её общим SDK.

## Проверка этого аудита

Повторно проверены три сценария непосредственно на текущем TS-модуле kit: safe-bottom49; слишком большой слот возвращает `place` с SDK-height100 без уменьшения слота; малый слот возвращает `reserve`37. Все прошли. Проверен фактический исходник установленного Capacitor8.6.0 `PluginCall.getLong`.

Тесты и предыдущие APK/GIF/profile результаты Arrows прочитаны как существующие доказательства, а не выданы за новые прогоны. Игра, SDK, runtime pins, сохранения и реклама не изменялись. Новая физическая приёмка не проводилась.

KIT IMPACT: **IMPROVE proposals + CANDIDATE**, не EXTRACTED. Исторические NONE в отчётах игровых версий не являются подтверждением, что перенос в kit уже состоялся.
