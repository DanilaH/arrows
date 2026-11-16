# UI / UX / feel — 0.32.0/code45

Текущая поставка поверх принятого владельцем0.31: приложение `46554912f0c16a44a93e54bc5703c53b62271d79`, финальный source/QA `c1fa9215e5bd6812d49ff995b96da683d5d711e0`. Полный разбор: [UI_UX_FEEL_032.md](../../UI_UX_FEEL_032.md). Свежие0.30контент/0.31помощь, прежние сохранения/права/результаты и pins сохранены.

## Что исправлено

| Приоритет / пункт | Фактический результат |
| --- | --- |
| P1 U32-1: видимый Play, компактный Calendar | 320×568: y581→428, h46, теперь целиком над навигацией; 360×640: y581→500; 390×844 и412×760: y711→521, приблизительно190px выше. Selected date/difficulty/Play отделены от прокручиваемого месяца, дни не перекрываются. |
| P1 U32-5: вечная «Загрузка» после кубка | Точный before-тест2/2 воспроизвёл disabled/aria-busy=true после отмены Worker через просмотр кубка. After2/2 PASS: Close возвращает Play, поздний ответ не создаёт попытку/receipt; retry той же даты открывает её настоящий Level. |
| P2 U32-2: просмотр кубка | В коротком landscape Open month был y459/h50 за экраном. Теперь Close/Open вне прокручиваемых деталей, иллюстрация уступает место действиям. |
| P2 U32-3: hit targets | Guides/Back/Close в коротком landscape38→44CSSpx, с прежним отдельным press-face. Это не измерение dp на телефоне. |
| P3 U32-4: стабильное действие и scroll | Выбор дня раскрывает только дату/сложность. Play не ездит и работает во время эффекта. Сохраняются scroll при refresh/Settings/возврате и положение исходящего снимка; новый месяц начинается с заголовка. |

На коротком экране месяцу иногда нужна прокрутка; кнопка запуска и выбранная дата остаются видимыми. Шесть недель не спрессованы в32px и не закрыты плавающей панелью. В игре не добавлены украшения, валюта, мета или новый эксперимент.

## Сборка и проверки

- `npm run check`: typecheck,232unit/29files, production build — PASS.
- Все66профильных browser-сценариев Calendar/UX review/meta arrivals/реального Worker/его отмены и ошибок — PASS, phone+desktop projects. Среди них20новых UI layout cases: RU/EN, обе темы, восемь сочетаний viewport, CSS150%текст, reduced motion, simulated asymmetric safe areas и сырые координатные нажатия до autoscroll.
- Отдельный повтор проблемного дробного измерения44CSSpx:5/5 PASS. Допуск0.01px устраняет compositor rounding43.99997, не разрешает прежние38px.
- Android CI:19JVM unit tests, sync, debug и signed playtest APK — PASS. Сверены официальный SDK `apksigner` V2 proof, `aapt`, APK SHA, реальные DEX BuildConfig и все28public-файлов;26local dist файлов совпадают байт-в-байт. Before28файлов совпадают с прежней подписанной0.31APK.
- Независимый прогон именно извлечённых финальных APK-файлов:78состояний,7viewport,0app errors; все46проверенных основных действий целиком внутри clipping ancestors и принимают hit tests. Исходные63состояния до правки хранятся в исходном внутреннем QA output; компактная baseline выборка и полные результаты текущего прохода — [ui-matrix.json](ui-matrix.json).
- Полный hosted browser CI: **458/458 PASS (23.4min)**; оба jobs завершены SUCCESS, финальный sync PASS. Факты: [checks.json](checks.json), [ci-web-summary.txt](ci-web-summary.txt). Run [43910122488](https://github.com/DanilaH/arrows/actions/runs/43910122488).

Identity: `com.danilah.arrows.playtest`, version0.32.0/code45, тот же V2 certificate SHA-256 `533aa2ff18337e3b3630c1363e7fe49f98e6b21371ce715689d2cbbf2e45ea36`. AD_MODE=test, оба Yandex demo units, analytics key пуст. APK11,006,193bytes, SHA-256 `84f59720dc11e059b19181ea23f73cc8063bcdad51ece4f19175859a310b4b01`. Фактические доказательства — [build-verification.json](build-verification.json), [official-signing.txt](official-signing.txt), [official-manifest.txt](official-manifest.txt).

Сверены Git object IDs: `domain`, `progression`, `content` и `app` целиком совпадают с принятой0.31базой; версии зависимостей прежние, native Gradle отличается только versionName/code. Proof — [compatibility.json](compatibility.json); он дополняет тесты старых попыток/прав, а не подменяет физическую установку.

## Скачать / посмотреть

- [Arrows-0.32.0-playtest.apk](https://chatgpt.com/library?file_id=libfile_fde3_f-891ab531b31c81919eb4ebd14b974851_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Календарь: до/после, прокрутка, быстрый Play и отмена/повтор загрузки — GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-0c7415140d4081918793e0b2c61be262_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Кубок: до/после и действие во время появления — GIF](https://chatgpt.com/library?file_id=libfile_fde3_f-f8a213e626508191b5addd4fd331bf91_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)
- [Текущая сборка: UI с настоящим звуком — MP4](https://chatgpt.com/library?file_id=libfile_fde3_f-3cd71205de1c8191bd2994382eb84a39_2841ca9da26c8191b7a266fa9b41a810&account_id=personal)

Источник: настоящие web-файлы подписанных APK0.31/0.32, Chromium/DPR1.5, Calendar320×568 и viewer568×320. Один и тот же подготовленный save, actual screenshots/CDP frames с прошедшим временем:186исходных кадров в5клипах. В эпизоде cancel/retry первый Worker явно задержан QA-адаптером; повтор использует настоящий production Worker и точный датированный Level. Контролируемый native transport не является SDK-рекламой или съёмкой Android. Рисованные кадры/добавленные демонстрационные звуки не использованы.

GIF немые. Отдельный MP4 содержит фактический WebAudio текущего приложения: video10.167s/audio10.184s, peak−18.6dBFS, без клиппинга. Не выдавать это за слушание динамика телефона или проверку физической вибрации. Встроенные подписи находятся вне игрового viewport. Сценарии и provenance: [capture-manifest.json](capture-manifest.json), hashes: [artifact-hashes.json](artifact-hashes.json). Воспроизведение: `tools/qa/verify-ui-apk.py`, `capture-ui-032.mjs`, `probe-ui-032.mjs`.

## Отдельные статусы

Владелец уже принял качественный игровой плейтест0.31; он не переоткрывается. Физический install/update новой0.32, её haptics/speaker и численные FPS/нагрев в этом проходе **NOT RUN**. Совместимость пакета/подписи и старых данных проверена инженерно. AppMetrica dashboard/live SDK accounts/реальные деньги — **NOT RUN**, отдельный релизный этап; .playtest намеренно не отправляет аналитику. Store не публиковался.

**KIT IMPACT: REUSE.** UI composition, Stable Progress/initial-actions и motion/viewport guidance `e04a3fe` применены к конкретным consumer-дефектам. Старый тест сам скроллил к скрытому Play; теперь действия проверяются до взаимодействия, art уступает месту CTA, отмена подготовки восстанавливает правдивое состояние. Runtime `a932526` прежний; общего API/правки mini-games-kit не понадобилось, upstream не менялся.
