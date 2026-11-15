import {writeFileSync} from 'node:fs';
import {generatePilot} from '../../.test-output/pilot-source/pilot-source.js';
writeFileSync('src/pilot/fields.json',JSON.stringify(generatePilot()));
