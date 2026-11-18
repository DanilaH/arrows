import { defineConfig } from 'vite';
import {resolve} from 'node:path';

export default defineConfig(({mode})=>({
  base: './',
  resolve: { dedupe: ['phaser'] },
  build: {
    target: 'es2022',
    rolldownOptions:{input:mode==='release'?{main:resolve(import.meta.dirname,'index.html')}:{main:resolve(import.meta.dirname,'index.html'),targetLab:resolve(import.meta.dirname,'target-lab.html'),contentPilot:resolve(import.meta.dirname,'content-pilot.html')}},
  },
  plugins:[{name:'arrows-build-channel',
    transformIndexHtml(html){return mode==='release'?html.replace(/\s*<aside id="debug-root" hidden><\/aside>/,''):html;},
    generateBundle(){this.emitFile({type:'asset',fileName:'arrows-build.json',source:JSON.stringify({schema:1,channel:mode==='release'?'release':'standard'})});}
  }],
}));
