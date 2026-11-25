// Exterior of the supplied four-button handset. Front view, 200×200 units.
// From back to front: pierced black tab, main shell and rolled edges, silver
// insert, four seated keycaps, top window, and the curved lower sliding cover.
const cn = "'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',sans-serif";
const caseOutline = 'M58.4 47.5Q58.5 33.1 65.8 29.7Q77.7 25.8 101.2 26.2Q125.2 25.8 135.6 29.1Q142.4 31.4 142.6 44.8L144.4 145.8Q145 154.2 139.7 158.2Q135.5 161.6 124.3 161.5L75 161.6Q61.3 161.5 57 155.4Q54.6 151.8 55.1 142.3Z';
const tab = 'M57 149Q57 160 64 164.5Q79.6 173.6 99.5 174.1Q122.3 173.9 137.9 165.9Q144.4 162.4 144.2 151.5L140.8 145H59.2Z M88.6 166.2a10.9 4.55 0 1 0 21.8 0a10.9 4.55 0 1 0-21.8 0Z';
const field = 'M67.2 50.2Q67.3 48.2 70 48.8Q99.6 52.7 128.9 48.5Q132.9 47.9 133.3 51.5L134.1 87.9Q99 94 65.5 87.9Z';
const cap = 'M58.7 46.6Q58.6 34.4 64 30.3Q68.7 26.2 99.5 26.3Q128.6 26.2 135.4 29.2Q141.8 32.5 142.4 42.8L142.7 50.2L136.8 48.4Q133.6 47.4 127.5 49Q99.3 53.3 73 49.4Q67.1 48.3 64.3 48.7L59 50.5Z';
const cover = 'M56.2 86.4Q58.5 83.7 63.2 84.8Q97.7 91.7 135.1 85.5Q141.2 84.1 144.1 87L144.7 144Q145.4 153.9 140 157Q135.2 160.4 125.6 160.6L72 160.6Q60.6 160 56.5 154.8Q54.6 151.4 55 145Z';
function symbol(name) {
  // Centres are relative to each key, including the compact stop / unlock mark.
  if (name === 'up') return '<path d="M0 -3.9 4.8 2.4H-4.8Z"/>';
  if (name === 'down') return '<path d="M0 3.8 -4.8 -2.6H4.8Z"/>';
  if (name === 'lock') return '<path d="M-2.8 -1V-3a2.8 2.8 0 0 1 5.6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="-4" y="-1" width="8" height="5.7" rx=".8"/><circle cx="0" cy="1.4" r=".72" fill="#54758b"/><path d="M0 1.6v1.7" stroke="#54758b" stroke-width=".7"/>';
  return '<rect x="-9.1" y="-1.9" width="4.6" height="4.6" rx=".25"/><path d="M-3 3.9.5-3.8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="1.8" y="-1" width="5.5" height="4.8" rx=".55"/><path d="M5.4-.8v-2.3a2.25 2.25 0 0 1 4.5 0v.65" fill="none" stroke="currentColor" stroke-width="1.4"/>';
}
function key(x,y,name) {
  return `<g ${name==='up'?'id="remote-key" ':''}transform="translate(${x} ${y})">
    <rect x="-12.3" y="-7.7" width="24.6" height="15.4" rx="3.1" fill="#e7e9e7"/>
    <rect x="-12.1" y="-7.6" width="24.2" height="14.7" rx="3" fill="#22313a"/>
    <rect x="-11.4" y="-6.8" width="22.9" height="13.8" rx="2.6" fill="url(#pr-key)"/>
    <g color="#eff6f7" fill="currentColor">${symbol(name)}</g></g>`;
}
function emboss(y, size, words) {
  const attrs=`x="100" text-anchor="middle" font-family="${cn}" font-weight="550" letter-spacing="1.15" font-size="${size}"`;
  return `<text ${attrs} y="${y+.36}" fill="#5b5d5c">${words}</text><text ${attrs} y="${y}" fill="#242625">${words}</text>`;
}
export function remote() {
  return `<g id="device-remote" stroke-linecap="round" stroke-linejoin="round">
    <defs>
      <linearGradient id="pr-shell" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="#151817"/><stop offset=".10" stop-color="#393c3c"/><stop offset=".25" stop-color="#282b2b"/><stop offset=".77" stop-color="#202222"/><stop offset=".94" stop-color="#373939"/><stop offset="1" stop-color="#181a1a"/></linearGradient>
      <linearGradient id="pr-cap" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#505252"/><stop offset=".27" stop-color="#3d3f3f"/><stop offset="1" stop-color="#2b2d2d"/></linearGradient>
      <linearGradient id="pr-metal" x1="0" y1="0" x2="1" y2=".15"><stop stop-color="#8e9697"/><stop offset=".12" stop-color="#cdd0cf"/><stop offset=".38" stop-color="#e3e5e2"/><stop offset=".61" stop-color="#bdc1bf"/><stop offset=".89" stop-color="#e0e2df"/><stop offset="1" stop-color="#9dA2a0"/></linearGradient>
      <linearGradient id="pr-key" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#728fa4"/><stop offset=".33" stop-color="#66879e"/><stop offset=".92" stop-color="#587b93"/><stop offset="1" stop-color="#4c697e"/></linearGradient>
      <linearGradient id="pr-cover" x1="0" y1="0" x2=".9" y2=".45"><stop stop-color="#202222"/><stop offset=".12" stop-color="#3e4040"/><stop offset=".33" stop-color="#363838"/><stop offset=".74" stop-color="#343636"/><stop offset="1" stop-color="#242626"/></linearGradient>
      <linearGradient id="pr-bottom" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#343636"/><stop offset=".65" stop-color="#333535"/><stop offset=".84" stop-color="#404242"/><stop offset="1" stop-color="#242626"/></linearGradient>
      <radialGradient id="pr-lens" cx=".37" cy=".32" r=".85"><stop stop-color="#73818a"/><stop offset=".5" stop-color="#50616c"/><stop offset=".9" stop-color="#2b363b"/></radialGradient>
      <pattern id="pr-brush" patternUnits="userSpaceOnUse" width="1.2" height="2"><path d="M0 0V2" stroke="#fbfdfc" stroke-opacity=".3" stroke-width=".25"/></pattern>
    </defs>
    <g transform="rotate(-2 99 100)">
      <ellipse cx="103" cy="172" rx="39" ry="3.3" fill="#28362e" opacity=".11"/>
      <path d="${tab}" fill="#383b3a" fill-rule="evenodd" stroke="#181a19" stroke-width="1.2"/>
      <path d="M88.9 166.3a10.7 4.6 0 0 0 21.2 0" fill="none" stroke="#555853" stroke-width="1.1"/>
      <path d="${caseOutline}" fill="url(#pr-shell)" stroke="#171918" stroke-width="1.7"/>
      <path d="M61.4 46.2 59.9 86.1M139 46.8l.9 38.9" fill="none" stroke="#626563" stroke-width="1.05"/>
      <path d="${field}" fill="url(#pr-metal)" stroke="#1a1d1c" stroke-width="1.1"/>
      <path d="${field}" fill="url(#pr-brush)"/>
      ${key(84,61.4,'up')}${key(114,61.4,'down')}${key(84,79.3,'lock')}${key(114,79.3,'unlock')}
      <path d="${cap}" fill="url(#pr-cap)" stroke="#1c1e1d" stroke-width="1.05"/>
      <path d="M64.1 31.1Q76 26.8 99.7 27.2Q126.7 26.9 135.3 29.9" fill="none" stroke="#646563" stroke-width=".9"/>
      <circle cx="100.2" cy="37.7" r="3.7" fill="#202222"/><circle cx="100.2" cy="37.9" r="2.85" fill="url(#pr-lens)"/>
      <path d="${cover}" fill="url(#pr-cover)" stroke="#202221" stroke-width="1"/>
      <path d="M56.1 118.4Q60.3 116.9 62.9 120.4C84.3 148.3 115.4 149.1 136.2 120.1Q139.1 116.4 144.4 118.2L144 145.7Q144.8 157.5 132.8 159.2Q110 161.1 73.2 159.6Q56.8 159.1 55.9 150.2Z" fill="url(#pr-bottom)" stroke="#242625" stroke-width="1"/>
      <path d="M68.2 94.2Q99.7 127.2 131.4 94.2" fill="none" stroke="#171918" stroke-width="1.15"/>
      <path d="M68.3 95Q99.8 127.8 131.1 95" fill="none" stroke="#555856" stroke-width=".55"/>
      <path d="M56.1 118.3Q60.3 116.8 63 120.5C84.1 148.2 115.3 149.1 136.3 120Q139.2 116.4 144.4 118.2" fill="none" stroke="#161817" stroke-width="1"/>
      ${emboss(101.8,10.8,'升级')}${emboss(123.5,9,'手机开门')}
      <g id="remote-active" opacity="0" transform="translate(84 61.4)">
        <rect x="-11.4" y="-6.8" width="22.9" height="13.8" rx="2.6" fill="#87b1ca" stroke="#d5e7ee" stroke-width="1.3"/>
        <g fill="#ffffff">${symbol('up')}</g>
      </g>
    </g></g>`;
}
