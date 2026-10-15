"""Generate a coherent flame-medal progression for 3, 7, 14, and 30 day streaks."""
from pathlib import Path
TIERS=[(3,'#ffe6c0','#bf8955','#7f5030',25),(7,'#f4fdff','#9db7cb','#4f738e',28),(14,'#fff0a4','#d6a12a','#8c6222',31),(30,'#f9ffff','#adcfdf','#47748f',34)]
for days,light,metal,dark,radius in TIERS:
 parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 144"><title>{days}-Day Streak medal</title><defs><linearGradient id="metal" x2=".75" y2="1"><stop stop-color="{light}"/><stop offset=".35" stop-color="{metal}"/><stop offset=".56" stop-color="{light}"/><stop offset="1" stop-color="{metal}"/></linearGradient><radialGradient id="face" cx=".35" cy=".25"><stop stop-color="#fcffff"/><stop offset="1" stop-color="{metal}"/></radialGradient><linearGradient id="flame" x2="0" y2="1"><stop stop-color="#ffdd6a"/><stop offset="1" stop-color="#f16d32"/></linearGradient></defs>']
 parts.append(f'<path d="M34 9H55L65 55 46 66 34 39ZM65 9H86L86 39 74 66 55 55Z" fill="#a43b51" stroke="#742b3e" stroke-width="2.5"/><path d="M42 10H48L57 49 51 53ZM72 10H78L69 53 63 49Z" fill="#ffc2b8"/><path d="M33 7H87V15H33Z" fill="url(#metal)" stroke="{dark}" stroke-width="2"/>')
 if days>=7:
  for side in [-1,1]:
   parts.append(f'<g transform="translate(60 0) scale({side} 1)">')
   if days==7:
    for i in range(4):
     y=67+i*11
     parts.append(f'<path d="M27 {y+10}Q43 {y} 37 {y-10}Q22 {y-4} 27 {y+10}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1"/>')
   else:
    for i in range(4 if days==14 else 5):
     y=59+i*11;edge=(49 if days==14 else 57)-i*2
     parts.append(f'<path d="M22 {y+19}Q39 {y+8} {edge} {y-12}Q{edge-1} {y+9} {edge-13} {y+20}L24 {y+31}Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.4"/>')
   parts.append('</g>')
 parts.append(f'<circle cx="60" cy="87" r="{radius}" fill="url(#metal)" stroke="{dark}" stroke-width="2.5"/><circle cx="60" cy="87" r="{radius-5}" fill="url(#face)" stroke="{light}" stroke-width="1.5"/>')
 parts.append('<path d="M60 63Q76 77 72 86Q69 95 60 95Q48 94 48 83Q49 76 53 74Q52 82 57 82Q62 75 60 63Z" fill="url(#flame)" stroke="#ac532b" stroke-width="1.5"/><path d="M60 79Q67 87 60 91Q54 88 60 79Z" fill="#fff3b6"/>')
 parts.append(f'<path d="M43 102H77L81 123H39Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.8"/><text x="60" y="119" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="800" fill="{dark}">{days}</text>')
 if days==30:
  parts.append(f'<path d="M40 57L34 39 49 47 60 31 71 47 86 39 80 57Z" fill="url(#metal)" stroke="{dark}" stroke-width="1.7"/><path d="M60 38L64 45 60 51 56 45Z" fill="#ee7c55" stroke="#fff" stroke-width="1"/>')
  parts.append('<path d="M99 61L101 66 106 68 101 70 99 75 97 70 92 68 97 66Z" fill="#fff" stroke="#82b3ce" stroke-width="1"/>')
 parts.append('</svg>')
 Path(f'assets/icons/achievement-streak-{days}.svg').write_text(''.join(parts)+'\n')
