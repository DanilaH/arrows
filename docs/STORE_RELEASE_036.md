# Подготовка стора — 0.36.0 / code51

База00a1141 сохраняет архив0.35 и предыдущие исправления. CI44063551909 теперь целиком SUCCESS:502browser/253unit/21JVM,capacity730дней,debug/playtest/R8releaseCheck. Это закрывает прежний pending полного web, но не доказывает реальные SDK/кабинет/деньги или физический телефон.

## Что поменялось

Новая установка начинает со светлой темы независимо от системной. HTML/CSS до JS, WebView background, native splash/window и первоначальные SystemBars согласованы со светлым фоном. Существующий сохранённый dark/light остаётся действующим; никаких массовых перезаписей preferences/save. После выбора тёмной темы её обычное сохранение и восстановление сохранены.

Новая сгенерированная иконка: три объёмные фиолетовые стрелки на светлом фоне. Canonical store export assets/brand/store-icon.png:512×512PNG,197501байт; тот же рисунок для legacy launcher и favicon. Transparent foreground assets/brand/launcher-foreground.png для adaptive/monochrome/splash; сильная alpha помещается в безопасный круг33dp (измерено31.65dp) после относительного inset15/108. Старый живой Home emblem и игровые стрелки не заменяются рисунком launcher.

Иконка создана встроенной генерацией изображений: square premium casual puzzle icon, three interlocking thick rounded purple/periwinkle/lilac arrows, filled rounded triangular heads, warm pale background, no text, strong48px silhouette; отдельный проход выделяет прозрачный foreground с сохранением геометрии. Технический export512px выполнен ImageMagick; два исходника входят в проверяемый generator, PNG-копии и XML не редактируются независимо. Прежние SVG остаются графикой интерфейса, canonical launcher/store теперь PNG. Отклонённый повтор маски не используется.

RuStore требует512×512PNG/JPG до3MB и соответствие иконки на витрине установленному приложению: https://www.rustore.ru/help/developers/publishing-and-verifying-apps/app-publication ; https://www.rustore.ru/help/developers/publishing-and-verifying-apps/requirement-apps . Проверено2026-11-17.

## GitHub Secrets

Открыть https://github.com/DanilaH/arrows/settings/secrets/actions и создать repository secrets. Значение каждого signing secret лежит в одноимённом txt внутри переданного приватного архива; не копировать имя файла вместо его содержимого.

| Secret | Значение |
| --- | --- |
| `ARROWS_RELEASE_KEYSTORE_BASE64` | Всё содержимое соответствующего txt; PKCS12 в Base64 |
| `ARROWS_RELEASE_STORE_PASSWORD` | Содержимое txt; пароль хранилища |
| `ARROWS_RELEASE_KEY_ALIAS` | `arrows_release` (также в txt) |
| `ARROWS_RELEASE_KEY_PASSWORD` | Содержимое txt; пароль ключа, для этого PKCS12 совпадает с store password |
| `ARROWS_RELEASE_CERT_SHA256` | Отпечаток из txt; публичная копия закреплена в production-signing.json |
| `APPMETRICA_API_KEY` | API key Android-приложения AppMetrica, UUID |
| `YANDEX_BANNER_AD_UNIT_ID` | Отдельный ID баннерного блока РСЯ; подключён в0.39.0 |
| `YANDEX_REWARDED_AD_UNIT_ID` | ID rewarded-блока РСЯ, вида R-M-число-число |
| `YANDEX_INTERSTITIAL_AD_UNIT_ID` | Другой ID interstitial-блока РСЯ |

В текущем продукте два рекламных формата; баннер не интегрирован и отдельного BANNER secret нет. `ARROWS_AD_MODE=live` и временный `ARROWS_RELEASE_KEYSTORE` задаются workflow автоматически, создавать их секретами не нужно. Debug key опционален и не участвует в production; .playtest принудительно сохраняет тестовую рекламу и выключенную аналитику.

Публичный SHA256 сертификата: `e7cb7061aebc42ca415ee8fbe17235769c6e40af4f1ab46fb17af68c8581bac6`, alias `arrows_release`, RSA4096/SHA256withRSA,10000дней. Это первый production signer, отдельный от .playtest. Сохранить приватный архив резервной копией: дальнейшие store-обновления подписываются тем же ключом. Ключ/пароли/Base64 не находятся в Git; публичный pin не является приватным ключом.

Создание secrets вручную пока требуется: доступный GitHub connector не поддерживает запись Actions secrets, а CLI здесь не авторизован. Значения рекламных/метрического ID владелец ещё не предоставил. Их не нужно отправлять в публичные файлы или журналы.

## Сборка

После заполнения secrets открыть Actions → Store release APK → Run workflow на main. Только ручной запуск, только main, contents:read. Временный ключ восстанавливается с0600, ожидаемый сертификат закреплён; несовпадающий pin/пустой/некорректный payload блокируются. Существующий файл не затирается. Отдельный always-шаг удаляет временный ключ.

Workflow проверяет конфигурацию без печати значений, запускает check/native sync release/JVM и assembleRelease с R8, затем официальный apksigner/zipalign/aapt/dexdump и точное сравнение web/schema/production signer. Результат — artifact arrows-store-release и mapping/verification. Он не создаёт release/tag, не отправляет приложение на модерацию и не публикует его. GitHub использует Base64 как транспорт в encrypted secrets, не как замену шифрованию: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets .

Пока live secrets отсутствуют, настоящая production APK и AppMetrica delivery/ad inventory/revenue остаются NOT RUN. Совместимая .playtest51 — отдельная проверка нового оформления. Физический install/update/launch mask/status bars/haptics/FPS и холодный двухлетний архив также отдельные проверки.

KIT IMPACT: REUSE (existing release acceptance, storage and authentic-media boundaries). Project signing workflow/icon/default preference, нового generic API нет; kit/store не менялись.
