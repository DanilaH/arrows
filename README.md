# Arrows / Стрелки

Минималистичная головоломка для Android / RuStore по согласованному видео-референсу.

**Состояние: первый игровой билд этапа A, 0.1.0.** Четыре контрольных поля: прямые и ломаные стрелки, Hard-цветок и Nightmare-бабочка на 188 стрелок. Работают вытягивание, блокировки, жизни/ошибки, удержание с отменой, pan/pinch, направляющие, реакция точек и переход после очистки. Нативная платформа подключена. Кампания, сохранение попыток, daily и игровые рекламные сценарии — следующие этапы.

## Запуск

Node 24 (см. `.nvmrc`), npm:

```sh
npm ci
npm run dev
```

```sh
npm run check                 # strict TypeScript, unit tests, production build
npx playwright install chromium
npm run test:browser          # browser smoke against dist; build first
npm run android:sync          # build + sync web assets/native plugins
npm run android:open          # Android Studio
```

Для Android: JDK 21, Android SDK platform 36 / build-tools 36.0.0. Из `native/android` выполнить `./gradlew assembleDebug` после `npm run android:sync`. В CI отдельный Android job собирает debug APK игровых контрольных полей; это не стор-релиз. `com.danilah.arrows` — исходный application ID, подлежит фиксации до публикации. Секреты и release keystore не входят в репозиторий.

## Основа

TypeScript 7.0.2, Vite 8.2.2, Phaser 4.2.1, Capacitor 8.6.0. `mini-games-kit` закреплён на [`a932526`](https://github.com/DanilaH/mini-games-kit/tree/a9325265e87583a4872cf6a158e1e881a0d7508e). Установку воспроизводит `package-lock.json`; зависимость не отслеживает `main`.

## Документы

- [Согласованное ТЗ](docs/ARROWS_REPLICATION_SPEC_V1_2026-11-08.md)
- [Разбор референса](docs/research/ARROWS_VIDEO_ANALYSIS_2026-11-08.md)
- [Что берём из game-kit](docs/KIT_REUSE.md)
- [Решения и адаптация стартера](docs/PROJECT_DECISIONS.md)
- [Текущий статус и следующий шаг](docs/HANDOFF.md)
- [Проверка Android-релиза](docs/RELEASE_CHECKLIST.md)
- [Нативные интеграции, конфигурация и границы проверок](docs/NATIVE_PLATFORM.md)
- [Первый игровой билд: реализация и проверки этапа A](docs/STAGE_A_IMPLEMENTATION.md)

[Исходные видео](https://drive.google.com/drive/folders/1Zw5hOmrq3N1CNFfMH610RiPgjeYAmbf6) повторно переданы пользователем 09.11.2026. Доступ к списку всех восьми MP4 подтверждён; ссылки, Drive ID и размеры сохранены в [реестре источников](docs/research/ARROWS_VIDEO_SOURCES_2026-11-09.json). Основной референс — V06/V11/V15/V19/V22; V25/V28/V31 используются только для сравнения. Повторного просмотра и проверки хешей сейчас не было. MP4 хранятся в Drive; старый реестр от 08.11, упомянутый в анализе, не был передан.

## Границы кода

`src/app` — запуск, viewport, локализация и browser/native lifecycle. `src/game` — представление Phaser. `native/android` — нативная оболочка. `tests/unit` — локальные контракты интеграции, `tests/browser` — настоящий браузер и production bundle.

`src/domain` — правила и геометрия, `src/content` — готовые контрольные поля, `src/input` — жесты и CSS/world-камера, `src/game` — Phaser-представление и DOM-управление. Генерация контрольных силуэтов выполняется отдельно командой `npm run content:controls`. Текущие попытки живут в памяти: долговечные сохранения и полноценная прогрессия относятся к этапу B.
