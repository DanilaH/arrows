import { startGame } from '../../src/app/bootstrap';
import { controlScenes } from '../../src/content/controlScenes';

// Isolated in-memory test entry. Never imported by src/main.ts or written to dist.
startGame(controlScenes);
