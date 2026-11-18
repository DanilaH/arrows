import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

/** Names-only diagnostics: never log keys, block IDs, signer passwords or paths. */
export function releaseConfigProblems(env,hasFile=existsSync){
 const required=['ARROWS_AD_MODE','YANDEX_REWARDED_AD_UNIT_ID','YANDEX_INTERSTITIAL_AD_UNIT_ID','YANDEX_BANNER_AD_UNIT_ID','APPMETRICA_API_KEY','ARROWS_RELEASE_KEYSTORE','ARROWS_RELEASE_STORE_PASSWORD','ARROWS_RELEASE_KEY_ALIAS','ARROWS_RELEASE_KEY_PASSWORD','ARROWS_RELEASE_CERT_SHA256'];
 const missing=required.filter(name=>!env[name]?.trim()),invalid=[];
 const check=(name,ok)=>{if(!missing.includes(name)&&!ok)invalid.push(name);};
 check('ARROWS_AD_MODE',env.ARROWS_AD_MODE==='live');
 for(const name of ['YANDEX_REWARDED_AD_UNIT_ID','YANDEX_INTERSTITIAL_AD_UNIT_ID','YANDEX_BANNER_AD_UNIT_ID'])check(name,/^R-M-\d+-\d+$/.test(env[name]??''));
 check('APPMETRICA_API_KEY',/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.APPMETRICA_API_KEY??''));
 check('ARROWS_RELEASE_CERT_SHA256',/^[0-9a-f]{64}$/i.test(env.ARROWS_RELEASE_CERT_SHA256??''));
 check('ARROWS_RELEASE_KEYSTORE',!!env.ARROWS_RELEASE_KEYSTORE&&hasFile(env.ARROWS_RELEASE_KEYSTORE));
 const units=['YANDEX_REWARDED_AD_UNIT_ID','YANDEX_INTERSTITIAL_AD_UNIT_ID','YANDEX_BANNER_AD_UNIT_ID'];
 for(const name of units)if(env[name]&&units.some(other=>other!==name&&env[other]===env[name]))invalid.push(name);
 return {missing,invalid:[...new Set(invalid)]};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {missing,invalid}=releaseConfigProblems(process.env);
 if(missing.length||invalid.length){console.error(JSON.stringify({releaseConfiguration:'BLOCKED',missing,invalid}));process.exitCode=1;}
 else console.info('Release configuration shape/signing-file presence OK; actual signer, SDK and dashboard acceptance still require artifact/device verification.');
}
