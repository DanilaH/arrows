# A1 после первой ошибки — фактическая приёмка0.26.0/code38

Независимый архив сохранён без правок в [iterations](../../iterations/a1-error-cue-2026-11-14/START_HERE.txt). Перед реализацией повторены5 его baseline-сценариев на main56f65a4: PASS,0 page errors. Код приложения19b2fecbe123c8c7b4d3666949b800f725b635f1; cb668fe1d9d03a23cdccc5a162668251e12f7b6c уточняет Q17, ad75a1a62b6dd6dafa48fede4d26ade75c2b9004 — только прежние тесты/fixture. APK/web/native/package bytes не изменены. Свежие исправления0.25 сохранены. Повторная Android assembly43626439148 побайтно идентична выданному APK.

## Проверки

`npm run check`:174 unit + typecheck + production build PASS. Полный локальный browser после уточнения наблюдателей:382/382 PASS (9.5m), включая96 A1. Повторный hosted CI43628885996 ещё IN PROGRESS; ему не присваивается GREEN. Дополнительно:6 повторов Q17 PASS,10 component cleanup PASS,4 настоящих APK-payload theme/motion/narrow/idle случая PASS; отдельный [новый daily/binding/error/reload](daily.json) PASS.19 JVM PASS, Android sync и обе Android-сборки PASS. Фактический срез — [ci-results.json](ci-results.json), [полный локальный browser](local-browser.json).

Первый локальный проход36/37: тестовый backoff имел нулевой retryInMs и закономерно истекал; исправлен только controlled transport. Расширенный проход94/96: два поздних утверждения «unlock ещё виден» гонялись со штатным завершением. Проверка уточнена: фактическое наличие unlock при вводе и срабатывание его собственного2800ms таймера. Для принудительного overlap только стенд ускоряет idle sampler и завершает обычный Hint entrance через WAAPI; код игры и длительность unlock не меняются. Повтор6/6 PASS. Это управляемый сценарий владения эффектами, не доказательство частоты такого пересечения у людей. Первый общий CI:377/382, два Q17 и три прежних временных ожидания (idle каскада, видимость финиша, короткоживущий bridge). Эти три прежних сценария отдельно повторены12/12 PASS без правок приложения или их тестов; [первый CI](first-ci.json) и [повторы](regression-repeats.json) сохранены. Второй CI:379/382, все96 A1 PASS, но два прежних cascade-marked нажатия пришлись на ещё движущуюся камеру, а bridge был прочитан после окончания. В ad75a1a тесты ждут существующий reveal_ready, наблюдают реальное idle-окно и снимают keyframes при вставке bridge. Пороги не ослаблены и приложение не менялось. [24 повтора PASS](old-test-observers.json), затем полный локальный382/382 PASS. [Второй CI](second-ci.json) сохранён; [повторный hosted CI](https://github.com/DanilaH/arrows/actions/runs/43628885996) идёт отдельно.

| ID | Статус | Наблюдение |
| --- | --- | --- |
| Q01 | PASS | Off не создаёт cue/trace. Обычный production browser не читает/пишет QA key и не показывает selector. Canonical help/lives/removals сохраняются. |
| Q02 | PASS | Control: одна opportunity,0 shown,0 visual и0 ad sessions. |
| Q03 | PASS | A1/ready/settled: одна opportunity, один painted shown после полного error feedback/heart motion; own opacity layer1200ms, неизменный Hint rect/transform, конечная очистка. |
| Q04 | PASS | Повтор c40-23 не стоит второй жизни и не создаёт opportunity; first=false. |
| Q05 | PASS | c40-24 после c40-23: first=true, lives1/errors2, без второй opportunity. |
| Q06 | PASS | Ошибка до3 активных секунд: нет opportunity и последующего replay после штатного появления Hint. |
| Q07 | PASS | Ошибка во время900ms entrance и искусственно продвинутая граница sample того же действия: нет cue/наложения. Clock вмешательство только в тесте. |
| Q08 | PASS | Видимая enabled Hint при idle/loading/backoff/unavailable/disabled не получает cue; последующий ready не создаёт повод. |
| Q09 | PASS | Expiry до paint сохраняет opportunity без shown; expiry после painted frame сохраняет ровно один shown и убирает слой. Readiness становится expired, не подделывается. |
| Q10 | PASS | Legacy/A2/A3/A4 исключены; отдельно проверены actual single-v2 fallback A2/A3 при candidate-disabled. Active/reserved A1 исключены; reserve claim работает в backoff без ad session. B1 остаётся отдельным. |
| Q11 | PASS | Принятый c40-21 сразу после ошибки: opportunity остаётся, shown0; ход/вылет не ждёт декора. |
| Q12 | PASS | Hint до/во время paint: один сохранённый request и одна ad session, earned A1 применяется; cue исчезает. |
| Q13 | PASS | Поздний receipt до/во время cue: помощь получает исходный frozen plan, lives/errors не откатываются, дополнительной ad session нет. |
| Q14 | PASS | Menu/modal/settings/restart/native Back/background/resize/language отменяют cue без replay. Отдельно медленный writer + полный background roundtrip. Actual finite manager: cancel/finish/destroy/resize до/после paint убирают свой слой/RAF; cancel сохраняет чужие press/arrival. |
| Q15 | PASS | Реальные CDP touch centre/2px left/right, hold/release/cancel и Enter. Тот же hit rect, действующий press-face, нужное число ad requests0/1. |
| Q16 | PASS | Normal/reduced × dark/light при320×700/DPR1.5: rect стабильный, подпись/readiness/video видны, pointer-events none, overflow нет.400ms reduced статичен. После завершения RAF возвращается в idle; это не замер физического FPS. |
| Q17 | PASS | First Hint entrance исключён. Настоящий calendar unlock при принудительном overlap доживает до своего таймера; cue не создаётся. Component cancel сохраняет текущий arrival и anchor/press. |
| Q18 | PASS | Reload после ошибки/active/reserved earned: board/errors/lives/right и камера сохранены, нового move/cue нет. Missing metadata старой попытки = off. |
| Q19 | PASS | Выбор будущего cue при текущем control или без записи → reload → первая ошибка не меняет текущий режим. Настоящий Restart создаёт новый binding и допускает cue. HelpVariant изменяется только своим отдельным QA-select; cue не меняет assistance-v1/schema. |
| Q20 | PASS инженерная; NOT RUN телефон | Установочный APK собран; package com.danilah.arrows.playtest, version0.26.0/code38, прежний сертификат/V2, demo ads, analytics key blank. Все16 captured payload файлов совпадают с APK. Физический install/update не выполнялся. |

Browser tests исполняют production dist с отдельно внедрённым controlled native transport и подготовленным прогрессом. Они наблюдают настоящий writer/receipts, DOM/input/WAAPI, число ad requests, geometry и trace. Component cleanup использует actual uiMotion source в отдельном минимальном DOM и не выдаётся за gameplay/Android. [Baseline](baseline-reproduced.json), [cleanup](motion-cleanup.json), [layout/idle](layout-idle.json), [native tests](native-unit-results.json), [binary inspection](apk-inspection.json), [payload guards](payload-guards.json), [capture source/hashes](capture-manifest.json).

## Что установить и посмотреть

- [arrows-0.26.0-code38.playtest.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-9b661652352c8191a593324bf26cbfc9_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Control / cue, два независимых дубля одного подготовленного участка](https://chatgpt.com/library?file_id=libfile_fde3_f-fa0ed637e2808191b20855169ced03d8_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Отмена быстрым правильным ходом](https://chatgpt.com/library?file_id=libfile_fde3_f-40116660965c819197f05b1ebc8c7196_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Удержание/отпускание2px внутри края Hint и одно получение A1](https://chatgpt.com/library?file_id=libfile_fde3_f-8ab678fcb9b88191a1da4f1856eaa116_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Настоящий игровой звук отдельно, MP4](https://chatgpt.com/library?file_id=libfile_fde3_f-68ec0afa09348191a04c4ca21e64f842_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Версия, подпись, SHA256 файлов и источник записи](https://chatgpt.com/library?file_id=libfile_fde3_f-cb9c2c7aa3008191a00478b8cca222c0_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)

По умолчанию Off. Settings → Assistance playtest: отдельно выбрать A1/useful single и Accent (или Control), затем обычный Restart/новая попытка. Режим не переключает текущую попытку даже после reload. Для акцента нужна уже полностью появившаяся Hint и готовое видео при первой ошибке всей попытки. Сохранённая/активная помощь намеренно исключает этот кандидат.

Источник записей: настоящий собранный web payload19b2fec, byte-match APK, Chromium390×844/DPR1.5, подготовленный c40 после21 законного удаления, controlled ad transport/receipts;0 page errors.59/94/61/121 исходных кадров, сохранено настоящее время независимых дублей. GIF без звука, MP4 — реальный WebAudio sink, без добавленного саундтрека. Источник подписан вне игрового кадра; сам эффект не нарисован поверх записи. Нового звука/вибрации cue нет. APK SHA256: ff20b7c3977e9f8fef37bd27a6ddce731899040a644e6bf0b98e4d0b2a41d102. Сертификат:533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36.

## Отдельные незакрытые стадии

NOT RUN: физическая установка/обновление, вибрация, динамик/audio focus, frame pacing/FPS/нагрев на телефоне, настоящий Android ad SDK/инвентарь, кабинет AppMetrica и реальные деньги. Они не блокируют эту тестовую APK и не объявлены пройденными. Нет человеческого подтверждения заметности/удовольствия, удержания или дохода. Forced QA/clicks/test ads не доказывают коммерческий эффект; будущий live-тест требует отдельного назначения и всех eligible в знаменателе. Пропущенный исход остаётся unknown; M1 — только дополнительная диагностика пользователей помощи.

KIT IMPACT: REUSE. Guidancee04a3fe: UI Motion Recipes — отдельное владение/неподвижный hit area/конечность и отмена; Small-Studio Experimentation — opportunity до treatment и честные уровни доказательств. Runtimea932526/StorageAdapter/activity/receipt seams и локальный finite manager сохранены. Нет обновления/пуша mini-games-kit, нового observer/experiment service, изменений контента/правил/жизней/lifetime gift/earned/advertising rhythm/analytics schema или публикации в магазине.

## Воспроизводимость инженерных проверок

```sh
npm run check
npx playwright test tests/browser/a1ErrorCue.spec.ts
npx playwright test tests/browser/a1ErrorCue.spec.ts --grep 'Q17 real' --repeat-each=3 --workers=2
npx vite build --ssr tools/qa/assistance-state.ts --outDir .test-output/assistance-source
mkdir -p .test-output/a1-error-cue-026/web
cp -a dist/. .test-output/a1-error-cue-026/web/
node tools/qa/verify-a1-cue-motion.mjs
node tools/qa/verify-a1-cue-layout.mjs
node tools/qa/verify-a1-cue-daily.mjs
node tools/qa/capture-a1-error-cue.mjs
```

Android sync/JVM/normal + .playtest сборки — неизменённый workflow CI с прежним cache key сертификата. APK проверен официальным ApkVerifier из apksig8.13.0 и бинарным чтением manifest/DEX, а не только Gradle source. Подготовленные результаты относятся к указанной версии и не заменяют последующую телефонную/человеческую приёмку.
