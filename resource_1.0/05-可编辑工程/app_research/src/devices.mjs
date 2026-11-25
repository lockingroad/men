// Drawings use a common 200 × 200 artboard, viewed slightly from above.
// The three '*-active' groups are intentionally transparent at rest. Animate
// their opacity with SMIL; nothing outside the phone screen is a radio pulse.
const ink = '#202e2a', green = '#087958', light = '#fcfcf3';
const cn = `'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',sans-serif`;

// Real photographed devices are separate modules, reusable in later Anatomy clips.
export { remote } from './photo-remote.mjs';
export { receiver } from './photo-controller.mjs';

export function phone() {
  return `<g id="device-phone" stroke-linejoin="round" stroke-linecap="round">
  <defs><linearGradient id="app-screen" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#edf0e4"/><stop offset="1" stop-color="#d7dfd2"/></linearGradient></defs>
  <g transform="rotate(-8 100 100)">
    <ellipse cx="106" cy="180" rx="47" ry="4.5" fill="#354a38" opacity=".10"/>
    <rect x="58.5" y="19" width="88" height="159" rx="16.6" fill="#778179" stroke="${ink}" stroke-width="2"/>
    <rect x="54.5" y="16" width="88" height="158.5" rx="16.4" fill="#303b35" stroke="${ink}" stroke-width="2"/>
    <rect x="59.3" y="20.7" width="78.5" height="149" rx="12.3" fill="url(#app-screen)" stroke="#18251e" stroke-width="1.3"/>
    <path d="M144.4 69.5v16" stroke="#545f57" stroke-width="2"/><path d="M54 51.2v9m0 6v10.2" stroke="#445148" stroke-width="1.8"/>
    <rect x="86.4" y="25.5" width="21" height="4.6" rx="2.3" fill="#3b473f"/><circle cx="112.3" cy="27.8" r="2.3" fill="#526159"/><circle cx="112" cy="27.1" r=".6" fill="#b9c7b7"/>
    <path d="M70 43h56" fill="none" stroke="#b1baaa" stroke-width="1"/>
    <!-- A shutter glyph is only an on-screen icon, not a wireless symbol. -->
    <g stroke="#607266" fill="none" stroke-width="2"><path d="M83 83V60h30v23M86 65h24m-24 5h24m-24 5h24m-24 4h24"/></g>
    <g id="phone-key"><rect x="67.2" y="98" width="62.6" height="30" rx="7" fill="#eff2e9" stroke="#6a7a6d" stroke-width="1.6"/><text x="98.5" y="118.8" font-family="${cn}" font-size="16" font-weight="650" fill="${ink}" text-anchor="middle">开门</text></g>
    <path d="M88 158.8h21.5" stroke="#8e9d8f" stroke-width="2.3"/>
    <g id="phone-active" opacity="0"><rect x="67.2" y="98" width="62.6" height="30" rx="7" fill="${green}"/><text x="98.5" y="118.8" font-family="${cn}" font-size="16" font-weight="650" fill="${light}" text-anchor="middle">开门</text></g>
  </g></g>`;
}
