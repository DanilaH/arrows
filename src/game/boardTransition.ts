import { roundedRoute, roundedTip, svgPoints } from './arrowArt';
import type { Point } from '../domain/geometry';

/** Read-only artwork for one prepared scene; no attempt, camera or save mutation. */
export interface BoardArtwork {
  levelId: string;
  camera: { x: number; y: number; scale: number };
  viewport: { x: number; y: number; width: number; height: number };
  ink: number;
  arrows: readonly { path: readonly Point[]; color: string; width: number; tip: number }[];
  afterPaint(done: () => void): () => void;
}
const ns = 'http://www.w3.org/2000/svg';
const pathData = (points: readonly Point[]): string => `M${svgPoints(points).replaceAll(' ', 'L')}`;
const inset = (r: { x: number; y: number; width: number; height: number }): string =>
  `inset(${Math.max(0,r.y)}px ${Math.max(0,innerWidth-r.x-r.width)}px ${Math.max(0,innerHeight-r.y-r.height)}px ${Math.max(0,r.x)}px)`;

/** One bounded SVG bridge between the existing Home preview and the real canvas frame. */
export function createBoardTransition(preview: SVGSVGElement, art: BoardArtwork, entering: boolean) {
  if (preview.dataset.level !== art.levelId || preview.dataset.selected !== 'true') return null;
  const matrix = preview.getScreenCTM(), rect = preview.getBoundingClientRect();
  const bodies = [...preview.querySelectorAll<SVGPolylineElement>('polyline')], heads = [...preview.querySelectorAll<SVGPathElement>('.preview-tip')];
  if (!matrix || !rect.width || !rect.height || bodies.length !== art.arrows.length || heads.length !== bodies.length) return null;
  const home = `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`;
  const { x,y,scale } = art.camera, game = `matrix(${scale},0,0,${scale},${x},${y})`;
  const layer = document.createElement('div'), svg = document.createElementNS(ns,'svg'), group = document.createElementNS(ns,'g');
  layer.classList.add('board-transition');layer.setAttribute('aria-hidden','true');
  svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);svg.append(group);
  const fade=document.createElement('div');fade.className='board-edge-fade';
  const edgeStyle=getComputedStyle(document.querySelector('#game-root')!);
  for(const name of ['--board-clear-top','--board-clear-bottom'])layer.style.setProperty(name,edgeStyle.getPropertyValue(name));
  layer.append(svg,fade);
  const homeInk = parseFloat(getComputedStyle(bodies[0]!).strokeWidth), gameInk = art.ink*scale;
  const opacity=entering?getComputedStyle(preview).opacity:'1';layer.style.opacity=opacity;
  layer.style.strokeWidth = `${entering ? gameInk : homeInk}px`;
  group.style.transformOrigin = '0 0';group.style.transform = entering ? game : home;
  layer.style.clipPath = entering ? inset(art.viewport) : inset(rect);
  for (const [i,arrow] of art.arrows.entries()) {
    const body = document.createElementNS(ns,'path'), tip = document.createElementNS(ns,'path');
    const color = entering ? getComputedStyle(bodies[i]!).stroke : arrow.color;
    body.setAttribute('d',entering ? `M${bodies[i]!.getAttribute('points')!.replaceAll(' ','L')}` : pathData(roundedRoute(arrow.path,arrow.tip*.82)));
    body.setAttribute('fill','none');body.setAttribute('stroke',color);body.setAttribute('vector-effect','non-scaling-stroke');
    body.setAttribute('stroke-linecap','round');body.setAttribute('stroke-linejoin','round');
    if (!entering && arrow.width !== art.ink) body.style.strokeWidth = `${arrow.width*scale}px`;
    tip.setAttribute('d',entering ? heads[i]!.getAttribute('d')! : `${pathData(roundedTip(arrow.path,arrow.tip))}Z`);
    tip.setAttribute('fill',entering ? getComputedStyle(heads[i]!).fill : arrow.color);tip.setAttribute('stroke','none');
    group.append(body,tip);
  }
  const visibility = preview.style.visibility;preview.style.visibility = 'hidden';document.body.append(layer);
  return { layer, group, opacity, from:entering?home:game, to:entering?game:home,
    clipFrom:entering?inset(rect):inset(art.viewport),clipTo:entering?inset(art.viewport):inset(rect),
    inkFrom:entering?homeInk:gameInk,inkTo:entering?gameInk:homeInk,
    reveal() { preview.style.visibility=visibility; },
    finish() { layer.remove();preview.style.visibility=visibility; },
  };
}
