# Как повторить исходные browser-наблюдения

Это probe закреплённой базы 0.25.0, а не тест новой реализации cue.

Скрипт run.mjs оставлен именно в том виде, который был исполнен. Его относительные импорты требуют такую структуру:

- каталог распакованного пакета;
- в нём baseline_probe/run.mjs;
- рядом с baseline_probe - отдельный checkout probe-checkout с установленными зависимостями.

Подготовить собственный чистый checkout DanilaH/arrows в probe-checkout на commit 56f65a4ee5b9b169b1a53ab21f06e186b9619d48. Использовать настроенный доступ к GitHub; не откатывать рабочую ветку разработки и не переносить незакоммиченные изменения.

В probe-checkout:

```sh
npm ci
npm run build
node node_modules/vite/bin/vite.js build --ssr tools/qa/assistance-state.ts --outDir .test-output/assistance-source
```

В baseline_probe:

```sh
node run.mjs
```

Нужен Chromium для закреплённого Playwright из проекта. Скрипт сам выбирает свободный локальный порт, запускает preview, выполняет пять сценариев и закрывает браузер/сервер. result.json будет перезаписан новым наблюдением; исходный файл из архива при необходимости сначала скопировать.

Probe не изменяет приложение или tracked-файлы. Build создаёт обычные игнорируемые выходные файлы. Controlled transport и seed предназначены только для внешнего QA; их нельзя переносить в production или выдавать за реальный SDK/поведение людей.
