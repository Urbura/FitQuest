"""Generate lightweight rank scenery. Run from the repository root with Python 3."""
from pathlib import Path
from math import sin, cos, pi

THEMES = [
 ('sky','Sky','#b9e9ff','#f4fcff','#7cc9ef',0),
 ('pearl','Bronze Dawn','#f4d1a9','#fff7df','#bc8355',1),
 ('rose','Silver Horizon','#bfd4e7','#f6fbff','#739abf',2),
 ('ice','Golden Arena','#ffd36b','#fff9d9','#ce922b',3),
 ('lagoon','Platinum Summit','#89dbe9','#f1ffff','#4d9dbb',4),
 ('ocean','Emerald Sanctuary','#7cdeb2','#edfff3','#249575',5),
 ('meadow','Diamond Sky','#8fd8ff','#f3fdff','#488cc8',6),
 ('lavender','Master Ascension','#bc94e7','#fcf4ff','#7f55ae',7),
 ('sunrise','Grandmaster Radiance','#ffc47a','#fff5d1','#b44956',8),
]
Path('assets/backgrounds').mkdir(parents=True,exist_ok=True)
for key,name,top,bottom,accent,tier in THEMES:
 parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1000" preserveAspectRatio="xMidYMid slice"><title>FitQuest {name} background</title><defs><linearGradient id="sky" x2=".25" y2="1"><stop stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient><radialGradient id="light"><stop stop-color="#fffbe0" stop-opacity=".95"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient><linearGradient id="ridge" x2="0" y2="1"><stop stop-color="{accent}" stop-opacity=".7"/><stop offset="1" stop-color="{accent}" stop-opacity=".18"/></linearGradient></defs><path fill="url(#sky)" d="M0 0H600V1000H0Z"/>']
 parts.append(f'<circle cx="{430 if tier%2 else 160}" cy="160" r="{110+tier*13}" fill="url(#light)"/>')
 if tier>=1:
  for i in range(7+tier*2):
   angle=2*pi*i/(7+tier*2);a=angle+.025
   pts=f'300,240 {300+1100*cos(angle):.1f},{240+1100*sin(angle):.1f} {300+1100*cos(a):.1f},{240+1100*sin(a):.1f}'
   parts.append(f'<polygon points="{pts}" fill="#fffbe0" opacity="{.10+tier*.012:.2f}"/>')
 parts.append(f'<path d="M0 750L65 630 125 705 220 590 310 710 410 610 510 720 570 620 600 665V1000H0Z" fill="url(#ridge)" opacity=".4"/>')
 parts.append(f'<path d="M0 860Q140 760 300 850T600 810V1000H0Z" fill="{accent}" opacity=".10"/>')
 if tier>=2:
  for r in range(3 if tier<5 else 5):
   parts.append(f'<ellipse cx="300" cy="1040" rx="{285+r*46}" ry="{160+r*37}" fill="none" stroke="{accent}" stroke-width="2" opacity=".22"/>')
 if tier>=3:
  # Laurel details stay at the outer edges, leaving the check-in area clear.
  for side in [-1,1]:
   parts.append(f'<g transform="translate({0 if side==1 else 600} 0) scale({side} 1)" fill="{accent}" opacity=".23">')
   parts.append('<path d="M12 920Q105 680 25 420" fill="none" stroke="currentColor" stroke-width="3"/>')
   for i in range(7+tier):
    y=450+i*31;x=20+34*sin(i*pi/(7+tier))
    parts.append(f'<path d="M{x:.1f} {y}Q{x+43:.1f} {y-34} {x+23:.1f} {y-55}Q{x-1:.1f} {y-33} {x:.1f} {y}Z"/>')
   parts.append('</g>')
 if tier>=4:
  # Faceted spires frame the higher-rank training grounds.
  for x,y,size in [(24,230,22),(575,295,26),(42,835,32),(556,875,34)]:
   parts.append(f'<path d="M{x} {y-size*2}L{x+size} {y} {x} {y+size*2} {x-size} {y}Z" fill="{accent}" opacity=".27" stroke="#fff" stroke-width="2"/><path d="M{x} {y-size*2}V{y+size*2}L{x-size} {y}Z" fill="#fff" opacity=".28"/>')
 if tier>=5:
  for i in range(18+(tier-5)*10):
   x=(i*137+37)%600;y=(i*193+50)%1000
   if 110<x<490 and 270<y<760:continue
   size=2+i%4
   parts.append(f'<path d="M{x} {y-size}L{x+1} {y-1} {x+size} {y} {x+1} {y+1} {x} {y+size} {x-1} {y+1} {x-size} {y} {x-1} {y-1}Z" fill="#fffef0" opacity=".8"/>')
 if tier>=6:
  for radius in [180,202,213]:parts.append(f'<circle cx="300" cy="95" r="{radius}" fill="none" stroke="{accent if tier==6 else "#f5cd70"}" stroke-width="{2 if radius!=202 else 5}" opacity=".32"/>')
 if tier>=7:
  for x in [22,578]:
   parts.append(f'<path d="M{x-18} 950V170Q{x} 135 {x+18} 170V950" fill="none" stroke="#f4d491" stroke-width="7" opacity=".65"/>')
 if tier==8:
  parts.append('<path d="M0 0H90L45 260 0 205ZM600 0H510L555 260 600 205Z" fill="#b7384b" opacity=".3"/>')
  parts.append('<path d="M248 105L235 65 273 85 300 40 327 85 365 65 352 105Z" fill="#ffd568" stroke="#fff3bd" stroke-width="3" opacity=".7"/>')
  parts.append('<path d="M0 980Q300 870 600 980" fill="none" stroke="#e7af3f" stroke-width="14" opacity=".3"/>')
 parts.append('</svg>')
 Path(f'assets/backgrounds/{key}.svg').write_text(''.join(parts)+'\n')
