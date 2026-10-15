"""Generate progressively ornate all-skills medals. Run from the repository root."""
from pathlib import Path
from math import sin,cos,pi
palettes={20:('#f5fcff','#9cb2c6','#526d87','#d9efff'),30:('#fff1aa','#d5a22a','#876123','#fff0bb'),40:('#f5ffff','#a5d8e9','#397c9b','#c5f5ff'),50:('#fff0a1','#e3ad34','#883f2d','#b93145')}
for tier,(light,metal,dark,face) in palettes.items():
 parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><title>All Skills Level {tier} medal</title><defs><linearGradient id="metal" x2=".7" y2="1"><stop stop-color="{light}"/><stop offset=".4" stop-color="{metal}"/><stop offset=".6" stop-color="{light}"/><stop offset="1" stop-color="{metal}"/></linearGradient><radialGradient id="face" cx=".4" cy=".3"><stop stop-color="{face}"/><stop offset="1" stop-color="{dark}"/></radialGradient></defs>']
 # Each step gains a broader silhouette and another layer of ornamentation.
 for side in [-1,1]:
  parts.append(f'<g transform="translate(80 0) scale({side} 1)">')
  if tier==20:
   parts.append(f'<path d="M21 116Q61 91 48 49" fill="none" stroke="{metal}" stroke-width="3"/>')
   for i in range(5):
    y=53+i*12
    parts.append(f'<path d="M44 {y+12}Q63 {y+1} 56 {y-10}Q39 {y-4} 44 {y+12}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1"/>')
  else:
   extent={30:65,40:71,50:77}[tier]
   for i in range(4 if tier==30 else 6):
    y=49+i*11;edge=extent-i*3
    parts.append(f'<path d="M22 {y+23}Q49 {y+10} {edge} {y-17}Q{edge-2} {y+11} {edge-16} {y+24}L23 {y+38}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.6"/>')
    if tier>=40:parts.append(f'<path d="M28 {y+24}L{edge-6} {y-4}" stroke="{face if tier==40 else "#fff3a5"}" stroke-width="2"/>')
  parts.append('</g>')
 if tier>=40:parts.append(f'<path d="M47 103L30 147 54 137 64 153 77 112M113 103L130 147 106 137 96 153 83 112Z" fill="{face}" stroke="{dark}" stroke-width="2"/>')
 radius={20:39,30:42,40:45,50:47}[tier]
 parts.append(f'<circle cx="80" cy="80" r="{radius}" fill="url(#metal)" stroke="{dark}" stroke-width="2.8"/><circle cx="80" cy="80" r="{radius-6}" fill="url(#face)" stroke="{light}" stroke-width="2"/>')
 star=' '.join(f'{80+sin(i*pi/5)*(25 if i%2==0 else 11):.1f},{79-cos(i*pi/5)*(25 if i%2==0 else 11):.1f}' for i in range(10))
 parts.append(f'<polygon points="{star}" fill="url(#metal)" stroke="{light}" stroke-width="1.4"/>')
 for i,color in enumerate(['#7962a6','#4f7836','#267b7d','#ad5b28','#3b6daa']):
  angle=i*2*pi/5;x=80+sin(angle)*(radius-2);y=80-cos(angle)*(radius-2)
  parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5.3" fill="{color}" stroke="{light}" stroke-width="2"/>')
 if tier>=40:parts.append(f'<path d="M80 18L87 29 80 41 73 29Z" fill="{face}" stroke="{metal}" stroke-width="2"/>')
 if tier==50:
  parts.append(f'<path d="M51 36L44 15 65 24 80 6 95 24 116 15 109 36Z" fill="url(#metal)" stroke="{dark}" stroke-width="2"/><path d="M54 36H106V42H54Z" fill="{metal}" stroke="{dark}" stroke-width="1.5"/>')
  parts.append('<path d="M80 15L85 24 80 32 75 24Z" fill="#f4495d" stroke="#fff0b5" stroke-width="1.5"/>')
 parts.append(f'<path d="M57 117H103L108 142H52Z" fill="url(#metal)" stroke="{dark}" stroke-width="2"/><text x="80" y="136" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="800" fill="{dark}">{tier}</text>')
 parts.append('</svg>')
 name='achievement-grandmaster' if tier==50 else f'achievement-all-skills-{tier}'
 Path(f'assets/icons/{name}.svg').write_text(''.join(parts)+'\n')
