import { writeFile } from 'node:fs/promises';
import { controlScenes, controlSceneStats } from '../../.test-output/control-source/control-scene-source.js';

await writeFile(new URL('../../src/content/controlScenes.json', import.meta.url), JSON.stringify(controlScenes));
console.info(controlSceneStats);
