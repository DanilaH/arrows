import { defineConfig } from 'vite';
import {resolve} from 'node:path';

export default defineConfig({
  base: './',
  resolve: { dedupe: ['phaser'] },
  build: {
    target: 'es2022',
    rolldownOptions:{input:{main:resolve(import.meta.dirname,'index.html'),targetLab:resolve(import.meta.dirname,'target-lab.html')}},
  },
});
