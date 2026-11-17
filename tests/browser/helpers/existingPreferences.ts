import type {Page} from '@playwright/test';
import {defaultSettings,SETTINGS_KEY} from '../../../src/app/settings';
/** Ordinary menu scenarios start after theme onboarding; fresh-profile tests
 * deliberately omit this fixture. Never seed game progress or overwrite prefs. */
export async function existingPreferences(page:Page,language='en'){
 await page.addInitScript(({key,settings})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(settings));},{key:SETTINGS_KEY,settings:defaultSettings(language)});
}
