/** Independent integer-cell oracle for expected marked-arrow release. Does not
 * call Board, canExit, rayHitsPath or the production dependency calculation. */
export function releaseOracle(level:{width:number;height:number;arrows:readonly{id:string;path:readonly{x:number;y:number}[]}[]},marked:readonly string[],accepted:readonly string[]):string[]{
 const removed=[...accepted];
 for(;;){
  const remaining=level.arrows.filter(a=>!removed.includes(a.id)),occupied=new Map<string,string>();
  for(const arrow of remaining)for(let i=1;i<arrow.path.length;i++){
   const a=arrow.path[i-1]!,b=arrow.path[i]!,n=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);
   for(let j=0;j<=n;j++)occupied.set(`${a.x+Math.sign(b.x-a.x)*j},${a.y+Math.sign(b.y-a.y)*j}`,arrow.id);
  }
  const ready=remaining.find(arrow=>{
   if(!marked.includes(arrow.id))return false;
   const h=arrow.path.at(-1)!,p=arrow.path.at(-2)!,dx=Math.sign(h.x-p.x),dy=Math.sign(h.y-p.y);
   for(let x=h.x+dx,y=h.y+dy;x>=0&&y>=0&&x<level.width&&y<level.height;x+=dx,y+=dy){const id=occupied.get(`${x},${y}`);if(id&&id!==arrow.id)return false;}
   return true;
  });
  if(!ready)return removed;removed.push(ready.id);
 }
}
