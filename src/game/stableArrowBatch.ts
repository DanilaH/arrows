import Phaser from 'phaser';
import {boardPalettes} from '../app/theme';

export interface TrianglePaint {
  fillStyle(color:number,alpha?:number): unknown;
  fillTriangle(ax:number,ay:number,bx:number,by:number,cx:number,cy:number): unknown;
}
/** Retains the same filled arrow triangles between dirty redraws. One tiny
 * palette atlas and one mesh; Canvas keeps the existing Graphics renderer. */
export class StableArrowBatch implements TrianglePaint {
  private readonly mesh:Phaser.GameObjects.Mesh2D;
  private readonly colors=[...new Set(Object.values(boardPalettes).flatMap(Object.values))];
  private u=.5;
  public constructor(scene:Phaser.Scene,root:Phaser.GameObjects.Container){
    if(!scene.textures.exists('arrow-ink')){
      const atlas=scene.textures.createCanvas('arrow-ink',this.colors.length*8,8)!,ctx=atlas.getContext();
      for(const [i,color] of this.colors.entries()){ctx.fillStyle=`#${color.toString(16).padStart(6,'0')}`;ctx.fillRect(i*8,0,8,8);}atlas.refresh();
    }
    this.mesh=scene.add.mesh2d(0,0,'arrow-ink',[],[]).setOrigin(0).setRenderAsTriangles(true);root.add(this.mesh);
  }
  public clear(): void { this.mesh.vertices.length=0;this.mesh.indices.length=0; }
  public fillStyle(color:number): void { this.u=(this.colors.indexOf(color)+.5)/this.colors.length; }
  public fillTriangle(ax:number,ay:number,bx:number,by:number,cx:number,cy:number): void {
    const mesh=this.mesh,index=mesh.vertices.length/4;
    mesh.vertices.push(ax,ay,this.u,.5,bx,by,this.u,.5,cx,cy,this.u,.5);mesh.indices.push(index,index+1,index+2,0);
  }
}
