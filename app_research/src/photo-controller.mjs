// Face-on exterior study of the photographed enclosure. No internals or wiring implied.
// 200 × 200 device artboard; same two IDs are driven by the comparison timeline.
const casing = 'M53 11 Q99 4.6 148 10.4 C158 12 164 17 166.8 30 C170 55 171.7 135 168.4 162.5 Q166.1 184.4 151 189 Q108 195 56 189.8 C42.3 188.2 36.7 180.8 35 168 C32.3 137 31 59 33.8 34 Q35.8 15.2 53 11Z';
const face = 'M51 21 Q101 13 149 18.2 Q157.4 19.8 160.8 32.5 C164 66 166 139 162.1 162.4 Q160.8 176 147 179.6 Q104 185 57 180.5 Q45.6 179.2 43 165.8 C39 128 38 62 40 38 Q40.9 24.6 51 21Z';

function grip(side) {
  // Broad, matte moulded lands; the cuts fan downwards at the top, upwards at the foot.
  const rows=[[27,11,19],[48,8,19],[69,4,19],[90,0,19],[111,-4,19],[132,-8,22]];
  return `<g data-grip-side="${side}"${side==='right'?' transform="translate(201 0) scale(-1 1)"':''}>
  ${rows.map(([y,rise,h],i)=>{
    const x=34.0+(i>3?.6:0), end=62+i*.55, yi=y+rise;
    return `<g data-grip="${i+1}">
      <path d="M${x} ${y} Q${x+5} ${y} ${end-4} ${yi-1} Q${end} ${yi} ${end+.2} ${yi+3} l.4 ${h-4} q0 2 -2.8 2 L${x} ${y+h+1} Z" fill="url(#rc-groove)"/>
      <path d="M${x+.3} ${y+.25} Q${x+5.2} ${y+.8} ${end-4} ${yi+.3} Q${end-.9} ${yi+1} ${end-1.1} ${yi+3.4} l.25 ${h-6} q0 1.5 -2.3 1.4 L${x+.8} ${y+h-1.5} Z" fill="url(#rc-land)"/>
      <path d="M${x+1.3} ${y+h-1.7} L${end-4.1} ${yi+h-1.8} q1.3 .3 2.2-.25" fill="none" stroke="#535451" opacity=".62" stroke-width=".65"/>
    </g>`;
  }).join('')}</g>`;
}

function holes(){
  const dots=[[0,-2],[-1,-1],[1,-1],[-2,0],[0,0],[2,0],[-1,1],[1,1],[0,2]];
  return `<g id="rc-perforations">${dots.map(([i,j])=>{
    const x=99+i*7.15,y=42+j*4.05;
    return `<g transform="translate(${x} ${y})"><ellipse cy=".38" rx="1.96" ry="1.97" fill="#676760"/><ellipse rx="1.84" ry="1.81" fill="#111313"/><path d="M-1.15 -.72Q0 -1.7 1.2 -.61" fill="none" stroke="#080908" stroke-width=".62"/></g>`;
  }).join('')}</g>`;
}

export function receiver(){
  const cable='M0 27 C12 23 23 17.5 33 17.4 Q39 16.9 45 20';
  return `<g id="device-receiver" stroke-linecap="round" stroke-linejoin="round">
    <title>控制器外壳：两侧斜纹、上方九孔、下方红色灯罩</title>
    <defs>
      <clipPath id="rc-face-clip"><path d="${face}"/></clipPath>
      <linearGradient id="rc-rim" x1="0%" y1="0%" x2="82%" y2="100%">
        <stop stop-color="#51514e"/><stop offset=".17" stop-color="#363735"/><stop offset=".61" stop-color="#242625"/><stop offset=".9" stop-color="#191b1a"/><stop offset="1" stop-color="#323431"/>
      </linearGradient>
      <linearGradient id="rc-matte" x1="0%" y1="0%" x2="85%" y2="100%">
        <stop stop-color="#535350"/><stop offset=".43" stop-color="#454643"/><stop offset="1" stop-color="#333532"/>
      </linearGradient>
      <linearGradient id="rc-land" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop stop-color="#424340"/><stop offset=".75" stop-color="#393b38"/><stop offset="1" stop-color="#313330"/>
      </linearGradient>
      <linearGradient id="rc-groove" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop stop-color="#1c1e1c"/><stop offset=".84" stop-color="#272926"/><stop offset="1" stop-color="#121413"/>
      </linearGradient>
      <pattern id="rc-grain" patternUnits="userSpaceOnUse" width="3.3" height="4">
        <circle cx=".6" cy=".6" r=".23" fill="#e6e4d8" opacity=".32"/><circle cx="2.18" cy="2.8" r=".31" fill="#111311" opacity=".33"/>
      </pattern>
      <linearGradient id="rc-wire" gradientUnits="userSpaceOnUse" x1="0" x2="44" y1="0" y2="0">
        <stop stop-color="#343632" stop-opacity="0"/><stop offset=".18" stop-color="#343632"/><stop offset=".92" stop-color="#21231f"/>
      </linearGradient>
      <radialGradient id="rc-lens-off" cx=".38" cy=".35" r=".82">
        <stop stop-color="#8a3538"/><stop offset=".44" stop-color="#611c20"/><stop offset=".78" stop-color="#380e13"/><stop offset="1" stop-color="#1e0b0c"/>
      </radialGradient>
      <radialGradient id="rc-lens-lit" cx=".42" cy=".38" r=".74">
        <stop stop-color="#ffc4ab"/><stop offset=".24" stop-color="#ff7969"/><stop offset=".52" stop-color="#ed3035"/><stop offset=".86" stop-color="#a20c20"/><stop offset="1" stop-color="#580d1a"/>
      </radialGradient>
    </defs>
    <ellipse cx="101" cy="191.3" rx="67" ry="5.3" fill="#283028" opacity=".11"/>
    <path d="${cable}" fill="none" stroke="url(#rc-wire)" stroke-width="2.45"/>
    <path d="${casing}" transform="translate(1.7 2)" fill="#1c1e1d" stroke="#141615" stroke-width="1.6"/>
    <path d="${casing}" fill="url(#rc-rim)" stroke="#222423" stroke-width="1.5"/>
    <path d="M37.4 31 Q40.2 16.7 53 13.4 Q101 7 146.9 12.5" fill="none" stroke="#6c6c66" stroke-width=".8" opacity=".74"/>
    <path d="${face}" fill="url(#rc-matte)"/>
    <g clip-path="url(#rc-face-clip)">${grip('left')}${grip('right')}
      <path d="${face}" fill="url(#rc-grain)" opacity=".16"/>
    </g>
    ${holes()}
    <g transform="translate(100 77.5)" id="receiver-led">
      <ellipse cy=".4" rx="8.1" ry="8.35" fill="#565651"/>
      <ellipse rx="7.95" ry="8.05" fill="#252423"/>
      <ellipse cy=".24" rx="6.9" ry="7.14" fill="#180d0f"/>
      <ellipse cy=".48" rx="5.65" ry="5.98" fill="url(#rc-lens-off)" stroke="#49191c" stroke-width=".55"/>
      <path d="M-3.45 3.3Q0 5.45 3.45 2.9" fill="none" stroke="#8e3033" stroke-width=".75"/>
      <circle cx="-1.3" cy="-1.8" r=".82" fill="#bc8c86" opacity=".74"/>
      <g id="receiver-active" opacity="0">
        <ellipse cy=".48" rx="5.75" ry="6.01" fill="url(#rc-lens-lit)"/>
        <path d="M-3.5 3.15Q0 5.25 3.6 2.72" fill="none" stroke="#ff7b70" stroke-width=".85"/>
        <ellipse cx="-1.5" cy="-1.6" rx="1.12" ry=".85" fill="#ffe1c9"/>
      </g>
    </g>
  </g>`;
}
