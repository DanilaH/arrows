/** Browser owns color interpolation and interrupted reversal. The bounded
 * attribute lifetime owns neither input nor preferences/gameplay durability. */
export function createThemePreview(){
 let timer:ReturnType<typeof setTimeout>|undefined,alive=true;
 const root=document.documentElement;
 const end=()=>{if(timer!==undefined)clearTimeout(timer);timer=undefined;delete root.dataset.themePreview;};
 return {
  begin(){if(!alive)return;if(timer!==undefined)clearTimeout(timer);timer=undefined;if(matchMedia('(prefers-reduced-motion: reduce)').matches){end();return;}root.dataset.themePreview='true';void getComputedStyle(root).getPropertyValue('--bg');timer=setTimeout(end,440);},
  destroy(){alive=false;end();},
 };
}
