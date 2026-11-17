import { describe, expect, it } from 'vitest';

import { normalizeGameLanguage,copy,countedArrows,routeSteps } from '../../src/app/language';

describe('normalizeGameLanguage', () => {
  it('keeps the baseline language set explicit', () => {
    expect(normalizeGameLanguage('ru-RU')).toBe('ru');
    expect(normalizeGameLanguage('en-US')).toBe('en');
    expect(normalizeGameLanguage(undefined)).toBe('en');
  });
});

it('has matching nonempty RU/EN meanings and substitution tokens',()=>{
 expect(Object.keys(copy.ru).sort()).toEqual(Object.keys(copy.en).sort());
 for(const key of Object.keys(copy.ru) as (keyof typeof copy.ru)[]){
  expect(copy.ru[key].trim()).not.toBe('');expect(copy.en[key].trim()).not.toBe('');
  expect(copy.ru[key].match(/\{\w+\}/g)??[]).toEqual(copy.en[key].match(/\{\w+\}/g)??[]);
 }
});
it('inflects actual and edge arrow/route counts in both grammatical contexts',()=>{
 for(const [count,arrow,step,genitive]of [[0,'стрелок','шагов','шагов'],[1,'стрелка','шаг','шага'],[2,'стрелки','шага','шагов'],[4,'стрелки','шага','шагов'],[5,'стрелок','шагов','шагов'],[11,'стрелок','шагов','шагов'],[14,'стрелок','шагов','шагов'],[21,'стрелка','шаг','шага'],[22,'стрелки','шага','шагов'],[25,'стрелок','шагов','шагов'],[101,'стрелка','шаг','шага'],[111,'стрелок','шагов','шагов']] as const){
  expect(countedArrows('ru',count)).toBe(`${count} ${arrow}`);expect(routeSteps('ru',count)).toBe(`${count} ${step}`);expect(routeSteps('ru',count,true)).toBe(`До ${count} ${genitive}`);
 }
 expect(countedArrows('en',1)).toBe('1 arrow');expect(countedArrows('en',4)).toBe('4 arrows');expect(routeSteps('en',1,true)).toBe('Up to 1 step');expect(routeSteps('en',5)).toBe('5 steps');
});
