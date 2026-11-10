"""Exact path overview from the current bank. A diagram, without gameplay/win UI."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
levels=json.loads(Path('src/content/campaign.json').read_text())
target=Path(sys.argv[1] if len(sys.argv)>1 else '.test-output/dense-catalog.png');target.parent.mkdir(parents=True,exist_ok=True)
ratio=2;canvas=Image.new('RGB',(1200*ratio,1710*ratio),'#1e1e2c');draw=ImageDraw.Draw(canvas)
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(size):return ImageFont.truetype(font_path,size*ratio)
def text(x,y,value,size=18,fill='#c8c6f2'):draw.text((x*ratio,y*ratio),value,font=font(size),fill=fill)
text(40,22,'Новый банк уровней',34);version=json.loads(Path('package.json').read_text())['version']
text(42,69,f'Шесть полей из кампании · точные пути из версии {version}',16,fill='#9394b8')
for i,(number,name) in enumerate([(6,'Цветок'),(20,'Бабочка'),(40,'Ключ'),(50,'Корона'),(60,'Шестерня'),(120,'Сердце')]):
 l=levels[number-1];x=30+(i%2)*585;y=110+(i//2)*525;w=555;h=505
 draw.rounded_rectangle((x*ratio,y*ratio,(x+w)*ratio,(y+h)*ratio),radius=24*ratio,fill='#232434',outline='#35374e',width=ratio)
 count=len(l['arrows']);word='стрелка' if count%10==1 and count%100!=11 else 'стрелки' if count%10 in [2,3,4] and count%100 not in [12,13,14] else 'стрелок'
 text(x+22,y+16,f'{number} · {name}',23);text(x+22,y+53,f'{count} {word} · '+('Hard' if l['difficulty']=='hard' else 'Nightmare'),15,fill='#9095ba')
 scale=min((w-65)/(l['width']+1),(h-103)/(l['height']+1));ox=x+w/2-(l['width']-1)*scale/2;oy=y+92+(h-111)/2-(l['height']-1)*scale/2
 width=max(.11*scale,1.9);headsize=max(.28*scale,width*2.8)
 def p(v):return ((ox+v['x']*scale)*ratio,(oy+v['y']*scale)*ratio)
 for a in l['arrows']:
  points=[p(v) for v in a['path']];draw.line(points,fill='#b7b6e9',width=round(width*ratio),joint='curve')
  for px,py in points[:-1]:draw.ellipse((px-width*ratio/2,py-width*ratio/2,px+width*ratio/2,py+width*ratio/2),fill='#b7b6e9')
  h0,b=a['path'][-1],a['path'][-2];dx=(h0['x']>b['x'])-(h0['x']<b['x']);dy=(h0['y']>b['y'])-(h0['y']<b['y']);hx,hy=points[-1];s=headsize*ratio
  draw.polygon([(hx+dx*s*.12,hy+dy*s*.12),(hx-dx*s-dy*s*.58,hy-dy*s+dx*s*.58),(hx-dx*s+dy*s*.58,hy-dy*s-dx*s*.58)],fill='#b7b6e9')
canvas.resize((1200,1710),Image.Resampling.LANCZOS).save(target)
print(target)
