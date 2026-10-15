"""Generate the matching, progressively ornamented Active Days medal series."""
from pathlib import Path
TIERS=[(3,'#ffe5ba','#bc8650','#7b4d2b',25),(7,'#ffedc8','#cc9659','#82542f',27),(14,'#f6fdff','#a7bfce','#50738b',29),(30,'#fff2ac','#ddab31','#8d6320',32),(100,'#f9ffff','#b1d2e3','#4c7793',35)]
for days,light,metal,dark,radius in TIERS:
 parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 158"><title>{days} Active Days medal</title><defs><linearGradient id="metal" x2=".8" y2="1"><stop stop-color="{light}"/><stop offset=".34" stop-color="{metal}"/><stop offset=".56" stop-color="{light}"/><stop offset="1" stop-color="{metal}"/></linearGradient><radialGradient id="face" cx=".35" cy=".25"><stop stop-color="#fbfff8"/><stop offset="1" stop-color="{metal}"/></radialGradient></defs>']
 parts.append(f'<path d="M43 9H65L74 56 55 65 43 39ZM75 9H97V39L85 65 65 56Z" fill="#318674" stroke="#205c51" stroke-width="2.5"/><path d="M51 10H57L66 48 60 52ZM83 10H89L80 52 74 48Z" fill="#c1f6df"/><path d="M42 7H98V15H42Z" fill="url(#metal)" stroke="{dark}" stroke-width="2"/>')
 if days>=7:
  for side in [-1,1]:
   parts.append(f'<g transform="translate(70 0) scale({side} 1)">')
   if days<=14:
    for i in range(3 if days==7 else 5):
     y=70+i*10
     parts.append(f'<path d="M29 {y+11}Q47 {y} 39 {y-11}Q24 {y-4} 29 {y+11}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.1"/>')
   else:
    for i in range(4 if days==30 else 6):
     y=61+i*10;edge=(53 if days==30 else 65)-i*2
     parts.append(f'<path d="M25 {y+19}Q47 {y+8} {edge} {y-13}Q{edge-2} {y+10} {edge-16} {y+23}L26 {y+33}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.4"/>')
   parts.append('</g>')
 if days==100:parts.append(f'<path d="M45 111L31 146 51 139 61 153 70 123M95 111L109 146 89 139 79 153 70 123" fill="#67b5b5" stroke="{dark}" stroke-width="2"/>')
 parts.append(f'<circle cx="70" cy="90" r="{radius}" fill="url(#metal)" stroke="{dark}" stroke-width="2.6"/><circle cx="70" cy="90" r="{radius-5}" fill="url(#face)" stroke="{light}" stroke-width="1.6"/>')
 if days>=7:parts.append(f'<circle cx="70" cy="90" r="{radius-8}" fill="none" stroke="{light}" stroke-width="1" opacity=".75"/>')
 # All five medals share a calendar/check motif; numbers identify their threshold.
 parts.append(f'<rect x="57" y="73" width="26" height="26" rx="4" fill="#edfdf4" stroke="{dark}" stroke-width="1.5"/><path d="M57 80H83M63 69V76M77 69V76" stroke="{dark}" stroke-width="2"/><path d="M62 89L67 94 77 84" fill="none" stroke="#237d62" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
 parts.append(f'<path d="M50 109H90L94 132H46Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.8"/><text x="70" y="127" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="800" fill="{dark}">{days}</text>')
 if days==100:
  parts.append(f'<path d="M47 59L40 39 57 48 70 30 83 48 100 39 93 59Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.7"/><path d="M70 37L75 46 70 54 65 46Z" fill="#8edce9" stroke="#fff" stroke-width="1.5"/>')
  for x,y in [(117,57),(24,120)]:parts.append(f'<path d="M{x} {y-6}L{x+1.5} {y-1.5} {x+6} {y} {x+1.5} {y+1.5} {x} {y+6} {x-1.5} {y+1.5} {x-6} {y} {x-1.5} {y-1.5}Z" fill="#fff" stroke="#88b6ce" stroke-width=".8"/>')
 parts.append('</svg>')
 filename='achievement-platinum' if days==100 else f'achievement-active-{days}'
 Path(f'assets/icons/{filename}.svg').write_text(''.join(parts)+'\n')
