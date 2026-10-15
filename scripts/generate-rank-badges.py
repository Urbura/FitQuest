"""Regenerate the eight rank SVGs. Run from the repository root with Python 3.

Palette order controls rank progression. Artwork is deterministic, transparent,
and uses no dependencies beyond Python's standard library.
"""
from pathlib import Path
from math import sin,cos,pi
ranks=[
 ('Bronze','#efba85','#a65b32','#61351f','#f9d5a2','#895032',.92),
 ('Silver','#f4fbff','#8fa9c2','#334f69','#edfaff','#83bdf3',.94),
 ('Gold','#fff1a6','#d99b20','#795018','#ffe477','#d99216',.96),
 ('Platinum','#f2ffff','#9bb8d2','#285977','#c2faff','#53d5f7',.98),
 ('Emerald','#fff1b6','#d2aa47','#185b45','#a7ffcf','#25d890',1),
 ('Diamond','#f2ffff','#87c6e9','#235b91','#c8faff','#3bc6ff',1),
 ('Master','#fff0ab','#d7a331','#55327e','#efd6ff','#bc79ff',1),
 ('Grandmaster','#fff2a2','#e0a224','#7d2337','#fff0a4','#f34b57',1.03),
]
def polygon(points):return ' '.join(f'{x:.1f},{y:.1f}' for x,y in points)
def gem(x,y,w,h,color):
 return f'<path d="M{x} {y-h}L{x+w} {y} {x} {y+h} {x-w} {y}Z" fill="{color}" stroke="#fff3ce" stroke-width="1.6"/><path d="M{x} {y-h}L{x} {y+h} {x-w} {y}Z" fill="#fff" opacity=".25"/>'
for n,(name,light,metal,dark,star,accent,scale) in enumerate(ranks):
 defs=f'''<defs><linearGradient id="metal" x2=".7" y2="1"><stop stop-color="{light}"/><stop offset=".45" stop-color="{metal}"/><stop offset=".7" stop-color="{light}"/><stop offset="1" stop-color="{metal}"/></linearGradient><linearGradient id="field" x2=".3" y2="1"><stop stop-color="{dark}"/><stop offset=".5" stop-color="{accent}"/><stop offset="1" stop-color="{dark}"/></linearGradient><linearGradient id="star" x2=".5" y2="1"><stop stop-color="#fffde5"/><stop offset=".5" stop-color="{star}"/><stop offset="1" stop-color="{metal}"/></linearGradient></defs>'''
 parts=[]
 if n==7:
  parts.append(f'<circle cx="80" cy="82" r="65" fill="none" stroke="{metal}" stroke-width="3"/><circle cx="80" cy="82" r="61" fill="none" stroke="{light}" stroke-width="1"/>')
 # Side silhouettes grow from leaves to broad layered wings.
 if n>=1:
  for side in [-1,1]:
   parts.append(f'<g transform="translate(80 0) scale({side} 1)">')
   if n<=2:
    parts.append(f'<path d="M23 121Q66 103 48 53" fill="none" stroke="{metal}" stroke-width="3"/>')
    for k in range(5):
     x=38+8*sin(k*pi/6);y=62+k*11
     parts.append(f'<path d="M{x} {y+9}Q{x+19} {y} {x+9} {y-12}Q{x-1} {y-5} {x} {y+9}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1"/>')
   else:
    extent=[0,0,0,66,70,73,75,76][n]
    for k in range(5):
     y=42+k*12; tip=extent-k*3
     parts.append(f'<path d="M20 {y+25}Q50 {y+14} {tip} {y-15}Q{tip-1} {y+12} {tip-15} {y+24}L24 {y+42}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.7"/><path d="M29 {y+27}L{tip-6} {y-2}" stroke="{light}" stroke-width="1" opacity=".8"/>')
   parts.append('</g>')
 if n>=4:
  # Ribbons make higher tiers occupy more vertical space as well.
  parts.append(f'<path d="M49 104L34 143 52 135 62 150 72 116M111 104L126 143 108 135 98 150 88 116" fill="{accent if n<7 else "#bd3044"}" stroke="{dark}" stroke-width="2"/>')
 if n in [4,5]:
  for x,y in [(46,35),(114,35),(35,94),(125,94)]:parts.append(gem(x,y,6,13,accent))
 # Beveled central shield; all ranks retain the same star identity.
 parts.append(f'<path d="M80 25Q100 42 124 45L119 93Q111 119 80 138Q49 119 41 93L36 45Q60 42 80 25Z" fill="url(#metal)" stroke="{dark}" stroke-width="2.8"/>')
 parts.append(f'<path d="M80 36Q99 49 114 52L109 92Q100 113 80 126Q60 113 51 92L46 52Q63 48 80 36Z" fill="url(#field)" stroke="{light}" stroke-width="2"/>')
 pts=[(80+sin(k*pi/5)*(30 if k%2==0 else 13),79-cos(k*pi/5)*(30 if k%2==0 else 13)) for k in range(10)]
 parts.append(f'<polygon points="{polygon(pts)}" fill="url(#star)" stroke="{dark}" stroke-width="1.6"/>')
 for k in range(0,10,2):
  a=pts[k];b=pts[(k+1)%10];parts.append(f'<path d="M80 79L{a[0]:.1f} {a[1]:.1f} {b[0]:.1f} {b[1]:.1f}Z" fill="#fff" opacity=".3"/>')
 parts.append(f'<path d="M41 47Q63 43 80 29L80 34Q63 48 46 51" fill="{light}" opacity=".65"/>')
 if n>=3:parts.append(gem(80,29,9,15,accent));parts.append(gem(80,127,6,10,accent))
 if n>=6:
  parts.append(f'<path d="M48 35L42 17 64 27 80 7 96 27 118 17 112 35Z" fill="url(#metal)" stroke="{dark}" stroke-width="2"/><path d="M49 35H111V42H49Z" fill="{metal}" stroke="{dark}" stroke-width="1.8"/>')
  parts.append(gem(80,23,6,10,accent))
 if n==7:
  parts.append(gem(58,30,3,5,'#f34b57'))
  parts.append(gem(102,30,3,5,'#f34b57'))
  parts.append(gem(80,145,5,8,'#f34b57'))
  for x,y in [(20,47),(141,48),(24,117),(138,115)]:
   parts.append(f'<path d="M{x} {y-5}L{x+1.5} {y-1.5} {x+5} {y} {x+1.5} {y+1.5} {x} {y+5} {x-1.5} {y+1.5} {x-5} {y} {x-1.5} {y-1.5}Z" fill="{light}"/>')
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><title>FitQuest {name} rank</title>{defs}<g transform="translate(80 80) scale({scale}) translate(-80 -80)">'+''.join(parts)+'</g></svg>\n'
 Path(f'assets/icons/rank-{name.lower()}.svg').write_text(svg)
