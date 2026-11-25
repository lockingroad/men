(() => {
  const scene = createScene(k, G, model.modelAt, model.CONFIG, orderParts);
  const closeupView = createCloseup(k, G, model.modelAt, model.CONFIG);
  const machine = document.getElementById('machine');
  const overview = document.getElementById('overview');
  const closeup = document.getElementById('closeup');
  const viewLabel = document.getElementById('view-label');
  const stage = document.getElementById('video-stage');
  const playButton = document.getElementById('play');
  const replayButton = document.getElementById('replay');
  const slider = document.getElementById('scrubber');
  const readout = document.getElementById('time-readout');
  const headline = document.getElementById('caption-main');
  const sub = document.getElementById('caption-sub');
  const index = document.getElementById('caption-index');
  const timeline = document.getElementById('timeline-bar');
  const accessible = document.getElementById('accessible-state');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const exporting = new URLSearchParams(location.search).has('export');
  if (exporting) document.body.classList.add('export-mode');
  let time = 0, playing = !calm.matches && !exporting, last = 0, frame = 0, visible = true, phase = -1;
  const ease = value => {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  };
  const progressAt = t => t < 1 ? 0 : t < 6.5 ? ease((t - 1) / 5.5) : t < 8.5 ? 1 : t < 11.5 ? 1 - ease((t - 8.5) / 3) : 0;
  const phases = [
    ['01 / 卷绕原理', '门帘升起后，藏到哪儿了？', '看这片深色帘片，跟着它走。'],
    ['02 / 沿轨上升', '两侧导轨，让门帘沿路升降', '相连的帘片向上移动，底梁一起抬起。'],
    ['03 / 逐片卷入', '到达上方，逐片绕上卷轴', '帘片连接处转动，门帘由直变弯。'],
    ['04 / 卷径增大', '卷得越多，外圈就越大', '底梁留在下方，不参与卷绕。'],
    ['05 / 反向放下', '反向转动，门帘沿原路放下', '卷起、展开，是同一条连续的门帘。'],
  ];
  function draw(t) {
    time = Math.max(0, Math.min(12, t));
    const progress = progressAt(time);
    const result = scene.draw(progress);
    machine.innerHTML = result.svg;
    const closeupShare = ease((time - 4.9) / 0.45) * (1 - ease((time - 7.9) / 0.45));
    overview.setAttribute('opacity', String(1 - closeupShare));
    closeup.setAttribute('opacity', String(closeupShare));
    viewLabel.setAttribute('opacity', String(closeupShare));
    if (closeupShare > 0) closeup.innerHTML = closeupView(progress);
    const nextPhase = time < 1.6 ? 0 : time < 3.5 ? 1 : time < 6.5 ? 2 : time < 8.5 ? 3 : 4;
    if (nextPhase !== phase) {
      phase = nextPhase;
      [index.textContent, headline.textContent, sub.textContent] = phases[phase];
      accessible.textContent = phases[phase][1];
    }
    slider.value = String(time);
    readout.textContent = `${time.toFixed(1)} / 12 秒`;
    timeline.setAttribute('width', String(810 * time / 12));
    stage.dataset.progress = progress.toFixed(6);
    stage.dataset.radius = result.model.radius.toFixed(3);
    stage.dataset.bottomZ = result.model.bottomZ.toFixed(3);
  }
  function updateButton() { playButton.textContent = playing ? '暂停' : '播放'; }
  function tick(now) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
    last = now;
    if (playing && visible) {
      draw(time + dt);
      if (time >= 12) { playing = false; updateButton(); }
      else frame = requestAnimationFrame(tick);
    }
  }
  function run() { if (!frame && playing && visible) { last = 0; frame = requestAnimationFrame(tick); } }
  function pause() { playing = false; cancelAnimationFrame(frame); frame = 0; updateButton(); }
  function toggle() {
    if (playing) pause();
    else { if (time >= 12) draw(0); playing = true; updateButton(); run(); }
  }
  window.renderAt = t => { pause(); draw(t); return { time, progress: Number(stage.dataset.progress), radius: Number(stage.dataset.radius), bottomZ: Number(stage.dataset.bottomZ) }; };
  window.demoReady = true;
  playButton.addEventListener('click', toggle);
  replayButton.addEventListener('click', () => { draw(0); playing = true; updateButton(); run(); });
  slider.addEventListener('input', () => { pause(); draw(Number(slider.value)); });
  document.addEventListener('keydown', event => {
    if (event.target.matches('input,button')) return;
    if (event.key === ' ') { event.preventDefault(); toggle(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); window.renderAt(time + 0.25); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); window.renderAt(time - 0.25); }
  });
  new IntersectionObserver(entries => {
    visible = entries.at(-1).isIntersecting;
    if (visible) run();
    else { cancelAnimationFrame(frame); frame = 0; last = 0; }
  }).observe(stage);
  calm.addEventListener('change', () => { if (calm.matches) pause(); });
  draw(0);
  updateButton();
  run();
})();
