"""Regenerate the three generic single-skill milestone SVG medals."""
from pathlib import Path
from math import sin,cos,pi
for level,light,metal,dark,accent in [
 (10,'#ffe8c0','#bf8951','#765037','#d59a5e'),
 (25,'#f7fdff','#a4bdd0','#456681','#65bff3'),
 (50,'#fff3af','#e0ac30','#815b20','#6953bb'),
]:
 parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><title>Skill Level {level} medal</title><defs><linearGradient id="metal" x2=".7" y2="1"><stop stop-color="{light}"/><stop offset=".4" stop-color="{metal}"/><stop offset=".58" stop-color="{light}"/><stop offset="1" stop-color="{metal}"/></linearGradient><linearGradient id="field" x2=".5" y2="1"><stop stop-color="{accent}"/><stop offset="1" stop-color="{dark}"/></linearGradient></defs>']
 if level>=25:
  for side in [-1,1]:
   parts.append(f'<g transform="translate(80 0) scale({side} 1)">')
   if level==25:
    parts.append(f'<path d="M20 119Q64 96 48 49" fill="none" stroke="{metal}" stroke-width="3"/>')
    for i in range(5):
     y=54+i*12
     parts.append(f'<path d="M43 {y+11}Q64 {y} 55 {y-11}Q38 {y-4} 43 {y+11}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1"/>')
   else:
    for i in range(5):
     y=45+i*12;edge=76-i*3
     parts.append(f'<path d="M23 {y+25}Q53 {y+9} {edge} {y-14}Q{edge-3} {y+13} {edge-18} {y+24}L24 {y+39}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.6"/>')
   parts.append('</g>')
 if level==50:parts.append(f'<path d="M51 105L33 146 57 138 68 152 79 113M109 105L127 146 103 138 92 152 81 113" fill="{accent}" stroke="{dark}" stroke-width="2"/>')
 parts.append(f'<path d="M80 23L119 46 114 96Q105 117 80 133Q55 117 46 96L41 46Z" fill="url(#metal)" stroke="{dark}" stroke-width="3"/><path d="M80 34L108 52 103 93Q96 108 80 119Q64 108 57 93L52 52Z" fill="url(#field)" stroke="{light}" stroke-width="2"/>')
 points=' '.join(f'{80+sin(i*pi/5)*(25 if i%2==0 else 11):.1f},{76-cos(i*pi/5)*(25 if i%2==0 else 11):.1f}' for i in range(10))
 parts.append(f'<polygon points="{points}" fill="url(#metal)" stroke="{light}" stroke-width="1.3"/>')
 if level>=25:parts.append(f'<path d="M80 17L88 29 80 41 72 29Z" fill="{accent}" stroke="{light}" stroke-width="2"/>')
 if level==50:parts.append(f'<path d="M50 35L43 14 65 24 80 6 95 24 117 14 110 35Z" fill="url(#metal)" stroke="{dark}" stroke-width="2"/><path d="M51 35H109V41H51Z" fill="{metal}"/><path d="M80 13L85 23 80 31 75 23Z" fill="#9adfff" stroke="#fff7c5" stroke-width="1.5"/>')
 parts.append(f'<path d="M55 113H105L109 139H51Z" fill="url(#metal)" stroke="{dark}" stroke-width="2"/><text x="80" y="133" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="800" fill="{dark}">{level}</text></svg>')
 Path(f'assets/icons/achievement-skill-{level}.svg').write_text(''.join(parts)+'\n')
