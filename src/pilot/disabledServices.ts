import type {AdsBridge,RewardedReadiness} from '../platform/ads';
import type {AnalyticsBridge} from '../platform/analytics';
/** A content comparison must never collect or acknowledge the main game's pending rewards. */
const state:RewardedReadiness={configured:false,phase:'disabled',ready:false,preloadId:'',loadedAt:0,expiresInMs:0,retryInMs:0,playtest:false};
export const pilotAds:AdsBridge={
 async prepareInterstitial(){},async prepareRewarded(){return state;},async status(){return{rewardedState:state};},
 async show(){return{shown:false,outcome:'unavailable'};},async pending(){return{receipts:[]};},
 async acknowledge(){throw Error('Content pilot cannot acknowledge rewards');},async cancelPending(){},
 async addListener(){return{remove:async()=>{}};},
};
export const pilotAnalytics:AnalyticsBridge={async report(){return{accepted:false,disabled:true};},async flush(){}};
