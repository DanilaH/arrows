# Portrait-only Android —0.32.1/code46

Владелец понял, что крупный обрезанный кубок был частью BEFORE-сравнения, и отдельно выбрал вертикальный игровой экран. Не менять снова кубок/Calendar0.32 по отозванному замечанию.

`MainActivity` получает `android:screenOrientation="portrait"` в основном AndroidManifest. Это запрос ориентации Activity до launch/splash, действующий и при последующем возврате к этой Activity. Не использовать `locked` (он может закрепить текущее горизонтальное положение), JS/CSS rotation, поздний fullscreen lock или повторные setters в lifecycle. SDK-рекламные Activity не переопределяются.

Приложение помечено `android:appCategory="game"`: фактически это игра, а для games Android16/API36 предусматривает исключение из игнорирования orientation restrictions на больших экранах. Не добавлять временные restricted-resizability opt-outs/запрет изменения размера. OEM, пользовательские режимы и оконное окружение могут применять собственные правила; поэтому существующая адаптивная вёрстка, safe area и короткие окна остаются защитным поведением. Браузерное изменение размера не является тестом Android-фиксации.

Официальные источники, прочитанные2026-11-16:

- [Activity / screenOrientation](https://developer.android.com/guide/topics/manifest/activity-element#screen)
- [Application / appCategory](https://developer.android.com/guide/topics/manifest/application-element#appCategory)
- [Android16 behavior changes / games exception](https://developer.android.com/about/versions/16/behavior-changes-16#large-screens)

Основной runtime/guidance pins, уровни, схемы и содержимое сохранений, права помощи/ошибки/жизни/flawless/gift и реклама не меняются. Version0.32.1/code46 позволяет обновить прежнюю .playtest0.32.0/code45; package/cache signing key прежние, Yandex test units и analytics OFF.

Проверить `npm run check`, Android sync/unit/build, официальный SDK signature proof, фактические screenOrientation/appCategory в декодированном манифесте подписанной APK, package/version/DEX config, и совпадение всех web payload hashes с0.32. Полный0.32CI458browser остаётся проверенной базой; новая native-конфигурация не требует перестройки макетов или нового browser GIF. Не выдавать повтор старого портретного web-захвата за проверку поворота телефона.

Текущие результаты и APK: `evidence/portrait-0321/ACCEPTANCE.md` после завершения сборки. Проверка поворота/launch/resume на реальном Android или эмуляторе — **NOT RUN**, пока нет соответствующего запуска. Физические haptics/FPS и live services остаются отдельными статусами; принятый владельцем0.31плейтест не переоткрывается.

**KIT IMPACT: NONE.** Это локальная продуктовая политика Android-манифеста; новые общие API/изменения кита не нужны. При выборе прочитан viewport-маршрут TASK_ROUTER; браузерная адаптивность сохранена. Upstream/store не менялись.
