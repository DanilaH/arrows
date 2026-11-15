/** Original code-native silhouettes. Frozen by dated generator v2; no borrowed assets. */
export const patternKinds=['rocket','crescent','fish','castle','flower','sword','owl','gear','boat','heart','cactus','infinity','umbrella','key','butterfly','magnet','mushroom','star','whale','shield','dragonfly','coffee','snowflake','mountain','octopus','lightning','bell','leaf','trophy','spiral','bulb','tree','crab','flame','crown','diamond','planet','hourglass','cross','bat'] as const;
export type PatternKind=typeof patternKinds[number];
type P=readonly [number,number];
function polygon(x:number,y:number,p:readonly P[]):boolean{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i]!,b=p[j]!;if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function patternMask(kind:PatternKind,width:number,height:number):(x:number,y:number)=>boolean{
 return(x,y)=>{
  const a=(x-(width-1)/2)/((width-2)/2),b=(y-(height-1)/2)/((height-2)/2),u=Math.abs(a),r=Math.hypot(a,b),angle=Math.atan2(b,a);
  const e=(cx:number,cy:number,rx:number,ry:number)=>((a-cx)/rx)**2+((b-cy)/ry)**2<1;
  const rect=(l:number,t:number,rr:number,bb:number)=>a>l&&a<rr&&b>t&&b<bb;
  const poly=(p:readonly P[])=>polygon(a,b,p);
  switch(kind){
   case 'rocket':return poly([[0,-.98],[.42,-.48],[.42,.28],[.86,.74],[.86,.94],[.28,.69],[-.28,.69],[-.86,.94],[-.86,.74],[-.42,.28],[-.42,-.48]])&&!e(0,-.2,.17,.19)||rect(-.18,.66,.18,.98);
   case 'crescent':return r<.95&&!e(.43,-.23,.77,.79);
   case 'fish':return e(-.15,0,.78,.59)||poly([[.39,0],[.96,-.61],[.96,.61]])||poly([[-.42,-.37],[-.06,-.89],[.3,-.37]])||poly([[-.3,.4],[.08,.86],[.3,.32]]);
   case 'castle':return rect(-.74,-.28,.74,.91)&&!(u<.18&&b>.44)||rect(-.94,-.74,-.48,.91)||rect(.48,-.74,.94,.91)||rect(-.94,-.95,-.78,-.5)||rect(-.65,-.95,-.48,-.5)||rect(.48,-.95,.65,-.5)||rect(.78,-.95,.94,-.5)||rect(-.2,-.6,.2,-.12);
   case 'flower':return r<.73+.23*Math.cos(5*(angle+Math.PI/2));
   case 'sword':return poly([[0,-.98],[.25,-.63],[.2,.25],[.83,.25],[.83,.48],[.17,.48],[.17,.86],[.29,.86],[.29,.98],[-.29,.98],[-.29,.86],[-.17,.86],[-.17,.48],[-.83,.48],[-.83,.25],[-.2,.25],[-.25,-.63]]);
   case 'owl':return(e(0,.15,.74,.79)||poly([[-.7,-.5],[-.71,-.96],[-.26,-.61],[.26,-.61],[.71,-.96],[.7,-.5]]))&&!(e(-.29,-.27,.16,.17)||e(.29,-.27,.16,.17));
   case 'gear':return r<.81+.13*Math.cos(10*angle)&&r>.28;
   case 'boat':return poly([[-.97,.4],[.96,.4],[.57,.88],[-.58,.88]])||rect(-.07,-.94,.07,.48)||poly([[-.14,-.86],[-.88,.24],[-.14,.24]])||poly([[.14,-.68],[.78,.24],[.14,.24]]);
   case 'heart':return(a*a+(b+.12)**2-.55)**3+a*a*(b+.12)**3<0;
   case 'cactus':return rect(-.2,-.94,.2,.96)||e(0,-.78,.2,.2)||rect(-.82,-.45,-.5,.38)||e(-.66,-.45,.16,.16)||rect(-.82,.12,-.08,.45)||rect(.5,-.74,.82,.07)||e(.66,-.74,.16,.16)||rect(.1,-.18,.82,.16);
   case 'infinity':return((u-.43)/.53)**2+(b/.67)**2<1&&((u-.43)/.25)**2+(b/.31)**2>1;
   case 'umbrella':return e(0,-.17,.94,.75)&&b<.13||rect(-.09,-.14,.09,.68)||e(.23,.66,.32,.3)&&b>.59&&!e(.23,.59,.14,.18);
   case 'key':return e(0,-.49,.49,.49)&&!e(0,-.49,.22,.22)||rect(-.14,-.12,.14,.97)||rect(.02,.38,.47,.6)||rect(.02,.77,.47,.97);
   case 'butterfly':return((u-.5)/.46)**2+((b+.39)/.53)**2<1||((u-.43)/.43)**2+((b-.48)/.48)**2<1||u<.09&&Math.abs(b)<.9;
   case 'magnet':return e(0,.1,.85,.88)&&!e(0,.1,.42,.49)&&b>-.07||rect(-.85,-.9,-.43,.18)||rect(.43,-.9,.85,.18);
   case 'mushroom':return e(0,-.24,.96,.71)&&b<.12||poly([[-.25,.01],[.25,.01],[.39,.89],[-.39,.89]]);
   case 'star':return r<.65+.31*Math.cos(5*(angle+Math.PI/2));
   case 'whale':return(e(-.14,.13,.76,.58)||poly([[.4,.14],[.72,-.49],[.99,-.59],[.9,-.06],[.99,.35],[.61,.38]]))||poly([[-.18,.48],[.11,.93],[.29,.48]])||rect(-.48,-.91,-.34,-.37)||e(-.41,-.85,.33,.13);
   case 'shield':return Math.abs(b)<.95&&u<(b<-.35?.86:.86*Math.sqrt((.96-b)/1.31));
   case 'dragonfly':return u<.1&&b>-.83&&b<.96||e(0,-.76,.19,.2)||e(-.48,-.29,.47,.23)||e(.48,-.29,.47,.23)||e(-.4,.2,.4,.24)||e(.4,.2,.4,.24);
   case 'coffee':return poly([[-.78,-.42],[.47,-.42],[.35,.65],[-.66,.65]])||e(.47,.03,.45,.42)&&!e(.47,.03,.22,.19)||e(-.14,.81,.8,.12)||rect(-.57,-.91,-.42,-.56)||rect(-.12,-.98,.03,-.56)||rect(.28,-.91,.43,-.56);
   case 'snowflake':return u<.14&&Math.abs(b)<.98||Math.abs(b)<.14&&u<.98||Math.abs(a-b)<.19&&r<.99||Math.abs(a+b)<.19&&r<.99||poly([[-.33,-.9],[0,-.65],[.33,-.9],[.33,-.64],[0,-.36],[-.33,-.64]])||poly([[-.33,.9],[0,.65],[.33,.9],[.33,.64],[0,.36],[-.33,.64]]);
   case 'mountain':return poly([[-.98,.85],[-.34,-.95],[.14,.17],[.52,-.5],[.99,.85]])&&!poly([[-.51,-.33],[-.34,-.74],[-.17,-.33],[-.31,-.43]]);
   case 'octopus':return e(0,-.25,.67,.7)||e(-.68,.49,.25,.4)||e(-.23,.68,.2,.3)||e(.23,.68,.2,.3)||e(.68,.49,.25,.4)||rect(-.7,.12,.7,.42);
   case 'lightning':return poly([[.17,-.98],[-.72,.17],[-.16,.17],[-.35,.98],[.76,-.28],[.16,-.28],[.51,-.98]]);
   case 'bell':return poly([[-.26,-.75],[.26,-.75],[.59,-.23],[.64,.44],[.92,.7],[-.92,.7],[-.64,.44],[-.59,-.23]])||e(0,-.75,.2,.23)||e(0,.72,.24,.25);
   case 'leaf':return a*a+b*b<.95&&Math.abs(a+b*.55)<.68;
   case 'trophy':return poly([[-.55,-.91],[.55,-.91],[.44,-.02],[.12,.3],[.12,.67],[.49,.67],[.49,.91],[-.49,.91],[-.49,.67],[-.12,.67],[-.12,.3],[-.44,-.02]])||e(-.55,-.48,.38,.41)&&!e(-.55,-.48,.18,.21)||e(.55,-.48,.38,.41)&&!e(.55,-.48,.18,.21);
   case 'spiral':return poly([[-.94,-.91],[.94,-.91],[.94,.94],[-.72,.94],[-.72,-.48],[.52,-.48],[.52,.53],[-.27,.53],[-.27,.12],[.1,.12],[.1,-.07],[-.3,-.07],[-.3,.56],[.57,.56],[.57,-.53],[-.76,-.53],[-.76,.97],[-.97,.97],[-.97,-.94]])||rect(-.94,-.91,.94,-.69)||rect(.72,-.9,.94,.94);
   case 'bulb':return e(0,-.25,.68,.69)||poly([[-.49,.1],[.49,.1],[.28,.65],[-.28,.65]])||rect(-.3,.6,.3,.82)||rect(-.21,.81,.21,.98);
   case 'tree':return poly([[0,-.98],[.67,-.25],[.36,-.25],[.84,.3],[.5,.3],[.99,.83],[-.99,.83],[-.5,.3],[-.84,.3],[-.36,-.25],[-.67,-.25]])||rect(-.16,.67,.16,.99);
   case 'crab':return e(0,.21,.6,.5)||e(-.73,-.41,.25,.39)&&!(a<-.74&&b<-.55)||e(.73,-.41,.25,.39)&&!(a>.74&&b<-.55)||rect(-.78,-.17,-.37,.14)||rect(.37,-.17,.78,.14)||poly([[-.45,.24],[-.97,.56],[-.97,.76],[-.35,.5]])||poly([[.45,.24],[.97,.56],[.97,.76],[.35,.5]])||poly([[-.28,.5],[-.59,.95],[-.36,.95],[0,.56]])||poly([[.28,.5],[.59,.95],[.36,.95],[0,.56]]);
   case 'flame':return poly([[.04,-.99],[.38,-.39],[.64,-.63],[.88,.13],[.71,.66],[.26,.97],[-.31,.94],[-.76,.56],[-.85,.09],[-.53,-.64],[-.36,-.22],[-.11,-.54]])&&!e(.03,.55,.23,.33);
   case 'crown':return poly([[-.94,-.76],[-.51,-.08],[0,-.94],[.51,-.08],[.94,-.76],[.74,.87],[-.74,.87]]);
   case 'diamond':return Math.abs(a)+Math.abs(b)<.98;
   case 'planet':return e(0,0,.66,.69)||Math.abs(b+.48*a)<.17&&u<.99;
   case 'hourglass':return Math.abs(b)<.94&&u<.21+.73*Math.abs(b);
   case 'cross':return u<.31&&Math.abs(b)<.96||Math.abs(b)<.31&&u<.96;
   case 'bat':return poly([[-.99,-.51],[-.55,-.76],[-.18,-.37],[-.19,-.78],[0,-.61],[.19,-.78],[.18,-.37],[.55,-.76],[.99,-.51],[.87,.47],[.57,.21],[.33,.58],[0,.92],[-.33,.58],[-.57,.21],[-.87,.47]]);
  }
 };
}
const fractions=new Map<PatternKind,number>();
export function patternSize(kind:PatternKind,cells:number,maxWidth=96):{width:number;height:number}{
 let fraction=fractions.get(kind);if(fraction===undefined){const mask=patternMask(kind,100,100);let count=0;for(let y=0;y<100;y++)for(let x=0;x<100;x++)if(mask(x,y))count++;fraction=count/10000;fractions.set(kind,fraction);}
 const width=Math.max(15,Math.min(maxWidth,Math.round(Math.sqrt(cells/(fraction*1.12))))),height=Math.min(100,Math.round(width*1.12));return{width,height};
}
