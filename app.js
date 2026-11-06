/* $AAAAAAAAAAAAA */
(() => {
'use strict';

// ---- fill these in at launch ----
const CONFIG = {
  ca: '',
  links: {
    pump: '',
    x: '',
    tg: '',
    chart: ''
  }
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const root = document.documentElement;
const body = document.body;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= links + CA ================= */
$$('[data-link]').forEach(a => {
  const url = CONFIG.links[a.dataset.link];
  if (url) a.href = url;
  else a.addEventListener('click', e => {
    e.preventDefault();
    const r = a.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 14, 30);
    scream({ rate: rnd(1.3, 1.6), gain: .6 });
  });
});
const caText = $('#caText'), caCopy = $('#caCopy');
if (CONFIG.ca) caText.textContent = CONFIG.ca;
caCopy.addEventListener('click', () => {
  if (!CONFIG.ca) { caCopy.textContent = 'soon'; setTimeout(() => caCopy.textContent = 'copy', 1200); return; }
  navigator.clipboard.writeText(CONFIG.ca).then(() => {
    caCopy.textContent = 'copied';
    setTimeout(() => caCopy.textContent = 'copy', 1200);
  });
});

/* ================= A wall ================= */
const agrid = $('#agrid');
const gridLetters = [];
function buildGrid() {
  agrid.innerHTML = '';
  gridLetters.length = 0;
  const rows = Math.ceil(window.innerHeight * 1.2 / 120) + 2;
  for (let r = 0; r < rows; r++) {
    const row = document.createElement('div');
    row.className = 'row ' + (r % 2 ? 'r' : 'l');
    row.style.setProperty('--spd', (28 + (r * 7) % 26) + 's');
    for (let h = 0; h < 2; h++) {
      const span = document.createElement('span');
      for (let i = 0; i < 22; i++) {
        const el = document.createElement('i');
        el.textContent = 'A';
        span.appendChild(el);
        gridLetters.push(el);
      }
      row.appendChild(span);
    }
    agrid.appendChild(row);
  }
}
buildGrid();
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(buildGrid, 300); });

function popLetters(n) {
  for (let i = 0; i < n; i++) {
    const el = pick(gridLetters);
    if (!el || el.classList.contains('pop')) continue;
    el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), rnd(300, 900));
  }
}
if (!reduced) setInterval(() => popLetters(amp > .05 ? 14 : 2), 140);

/* hero ticker letters */
const tickerBig = $('#tickerBig');
tickerBig.innerHTML = [...tickerBig.textContent].map(c => `<i>${c}</i>`).join('');
const tickerChars = $$('i', tickerBig);

/* ================= particles ================= */
const particles = $('#particles');
function burst(x, y, n = 12, size = 40) {
  if (reduced) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'pa' + (Math.random() < .35 ? ' p' : '');
    p.textContent = 'A';
    const a = Math.random() * Math.PI * 2, d = rnd(60, 260);
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.fontSize = rnd(size * .4, size) + 'px';
    p.style.setProperty('--dx', Math.cos(a) * d + 'px');
    p.style.setProperty('--dy', Math.sin(a) * d + 'px');
    p.style.setProperty('--rot', rnd(-200, 200) + 'deg');
    particles.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}
document.addEventListener('pointerdown', e => {
  if (e.target.closest('button, a, input, textarea, audio, .mm, .lightbox')) return;
  burst(e.clientX, e.clientY, 8, 34);
});

/* ================= audio engine ================= */
const AC = window.AudioContext || window.webkitAudioContext;
const ctx = new AC();
const master = ctx.createGain();
const analyser = ctx.createAnalyser();
analyser.fftSize = 1024;
master.connect(analyser);
analyser.connect(ctx.destination);

let buf = null, rbuf = null;
const ready = fetch('/assets/audio/aaa.mp3')
  .then(r => r.arrayBuffer())
  .then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
  .then(b => {
    buf = b;
    rbuf = ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) {
      const d = b.getChannelData(c).slice().reverse();
      rbuf.copyToChannel(d, c);
    }
    drawWaves();
    return b;
  });

let impulse = null;
function getImpulse() {
  if (impulse) return impulse;
  const len = ctx.sampleRate * 3.2;
  impulse = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = impulse.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return impulse;
}
function curve(k) {
  const n = 44100, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x)); }
  return c;
}

const FX = {
  stadium(src) {
    const out = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver();
    conv.buffer = getImpulse(); wet.gain.value = .9;
    src.connect(out); src.connect(conv); conv.connect(wet); wet.connect(out);
    return out;
  },
  phone(src) {
    const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), ws = ctx.createWaveShaper();
    hp.type = 'highpass'; hp.frequency.value = 700;
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    ws.curve = curve(40);
    src.connect(hp); hp.connect(lp); lp.connect(ws);
    return ws;
  },
  distort(src) {
    const ws = ctx.createWaveShaper(), g = ctx.createGain();
    ws.curve = curve(400); ws.oversample = '4x'; g.gain.value = .55;
    src.connect(ws); ws.connect(g);
    return g;
  },
  echo(src) {
    const out = ctx.createGain(), d = ctx.createDelay(2), fb = ctx.createGain();
    d.delayTime.value = .28; fb.gain.value = .55;
    src.connect(out); src.connect(d); d.connect(fb); fb.connect(d); d.connect(out);
    return out;
  },
  underwater(src) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 8;
    src.connect(lp);
    return lp;
  }
};

let screamCount = 0;
try { screamCount = +localStorage.getItem('aaa-count') || 0; } catch (e) {}
const countEl = $('#screamCount');
countEl.textContent = screamCount.toLocaleString('en-US');
function bumpCount() {
  screamCount++;
  countEl.textContent = screamCount.toLocaleString('en-US');
  try { localStorage.setItem('aaa-count', screamCount); } catch (e) {}
}

const flash = $('#flash');
function doFlash() {
  if (reduced) return;
  flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
}

function scream(o = {}) {
  if (!buf) { ready.then(() => scream(o)); return null; }
  if (ctx.state === 'suspended') ctx.resume();
  const rate = o.rate || 1;
  const src = ctx.createBufferSource();
  src.buffer = o.reverse ? rbuf : buf;
  src.playbackRate.value = rate;
  if (o.loop) { src.loop = true; src.loopStart = .45; src.loopEnd = Math.max(.9, buf.duration - .5); }
  const g = ctx.createGain();
  g.gain.value = o.gain == null ? 1 : o.gain;
  const out = o.fx ? FX[o.fx](src) : src;
  out.connect(g); g.connect(master);
  src.start();
  const tail = o.fx === 'stadium' || o.fx === 'echo' ? 3 : 0;
  src.onended = () => setTimeout(() => g.disconnect(), tail * 1000);
  bumpCount();
  doFlash();
  const startedAt = ctx.currentTime;
  return {
    src, g, rate, startedAt, dur: buf.duration / rate,
    stop() {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + .18);
      src.stop(t + .2);
    }
  };
}

/* ================= amplitude loop ================= */
let amp = 0, micAmp = 0;
const tdata = new Float32Array(analyser.fftSize);
const heroCat = $('#heroCat');
function meter() {
  analyser.getFloatTimeDomainData(tdata);
  let s = 0;
  for (let i = 0; i < tdata.length; i += 2) s += tdata[i] * tdata[i];
  const rms = Math.sqrt(s / (tdata.length / 2));
  const target = Math.min(1, Math.max(rms * 3.2, micAmp));
  amp += (target - amp) * (target > amp ? .5 : .12);
  if (amp < .002) amp = 0;
  root.style.setProperty('--amp', amp.toFixed(3));
  const loud = amp > .06;
  body.classList.toggle('crash', loud && !reduced);
  body.classList.toggle('loud', loud);
  if (loud) {
    tickerChars.forEach(c => c.style.transform = `translateY(${rnd(-1, 1) * amp * 22}px) scaleY(${1 + amp * rnd(0, 1.2)})`);
  } else if (tickerChars[0].style.transform) {
    tickerChars.forEach(c => c.style.transform = '');
  }
  requestAnimationFrame(meter);
}
requestAnimationFrame(meter);

/* ================= players with real waveform ================= */
const players = $$('.player');
function drawWaves() {
  const data = buf.getChannelData(0);
  players.forEach(p => {
    const w = $('.wave', p), n = +w.dataset.bars || 48;
    const step = Math.floor(data.length / n);
    const peaks = [];
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let j = i * step; j < (i + 1) * step; j += 16) m = Math.max(m, Math.abs(data[j]));
      peaks.push(m);
    }
    const max = Math.max(...peaks) || 1;
    w.innerHTML = peaks.map(v => `<b style="height:${Math.max(10, v / max * 100)}%"></b>`).join('');
    $('.dur', p).textContent = '0:0' + Math.round(buf.duration / (+p.dataset.rate || 1));
  });
}
players.forEach(p => {
  let cur = null;
  const go = () => {
    if (cur) { cur.stop(); return; }
    const rate = +p.dataset.rate || 1;
    cur = scream({ rate });
    if (!cur) return;
    p.classList.add('on');
    const bars = $$('.wave b', p);
    const tick = () => {
      if (!cur) return;
      const f = (ctx.currentTime - cur.startedAt) / cur.dur;
      bars.forEach((b, i) => b.classList.toggle('done', i / bars.length < f));
      if (f < 1) requestAnimationFrame(tick);
    };
    tick();
    cur.src.addEventListener('ended', () => {
      cur = null; p.classList.remove('on');
      bars.forEach(b => b.classList.remove('done'));
    });
  };
  $('.play', p).addEventListener('click', go);
  $('.wave', p).addEventListener('click', go);
});

/* ================= hold to scream ================= */
const holdBtn = $('#holdBtn');
let held = null, holdBurst = null;
function holdStart(e) {
  e.preventDefault();
  if (held) return;
  held = scream({ loop: true, rate: 1 });
  holdBtn.classList.add('on');
  $('.hold-txt', holdBtn).textContent = 'AAAAAAAAAAAA';
  holdBurst = setInterval(() => {
    const r = holdBtn.getBoundingClientRect();
    burst(rnd(r.left, r.right), r.top + r.height / 2, 4, 54);
    if (held) held.src.playbackRate.value = Math.min(1.5, held.src.playbackRate.value + .015);
  }, 90);
}
function holdEnd() {
  if (!held) return;
  held.stop(); held = null;
  clearInterval(holdBurst);
  holdBtn.classList.remove('on');
  $('.hold-txt', holdBtn).textContent = 'hold to crash out';
}
holdBtn.addEventListener('pointerdown', holdStart);
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => holdBtn.addEventListener(ev, holdEnd));
holdBtn.addEventListener('contextmenu', e => e.preventDefault());

/* ================= keyboard ================= */
document.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'a' || e.key === 'A') {
    scream({ rate: rnd(.82, 1.3) });
    burst(rnd(innerWidth * .2, innerWidth * .8), rnd(innerHeight * .3, innerHeight * .7), 18, 70);
  } else if (/^[1-8]$/.test(e.key)) {
    const pad = pads[+e.key - 1];
    if (pad) pad.el.click();
  } else if (e.key === 'Escape') closeLb();
});

/* ================= callout feed ================= */
const callers = ['bagwatcher', '4am_chart_checker', 'exit_liquidity_ceo', 'sold_at_3k', 'dev_please_answer', 'mom_i_lost_it', 'rug_survivor_2', 'pumpfun_poet', 'one_more_candle', 'cope_and_hold', 'zero_sleep_sol', 'liquidated_larry', 'bought_the_top', 'jeetjeet', 'its_so_over', 'we_are_so_back'];
const feedTrack = $('#feedTrack');
function feedItem(name) {
  const secs = Math.floor(rnd(3, 15));
  const bars = Array.from({ length: 14 }, () => `<i style="height:${Math.floor(rnd(3, 16))}px"></i>`).join('');
  const a = 'A'.repeat(Math.floor(rnd(6, 18)));
  return `<div class="fi" data-r="${rnd(.75, 1.35).toFixed(2)}"><b>@${name}</b><span class="mini">${bars}</span><span class="t">0:${String(secs).padStart(2, '0')}</span><span class="c">${a}</span></div>`;
}
const feedHtml = callers.map(feedItem).join('');
feedTrack.innerHTML = feedHtml + feedHtml;
feedTrack.addEventListener('click', e => {
  const fi = e.target.closest('.fi');
  if (!fi) return;
  scream({ rate: +fi.dataset.r });
  const r = fi.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top, 10, 34);
});

/* ================= T-01 recorder ================= */
const recBtn = $('#recBtn'), recStatus = $('#recStatus'), recDb = $('#recDb');
const recCanvas = $('#recCanvas'), rc = recCanvas.getContext('2d');
const recResult = $('#recResult');
let rec = null;
const levels = [];
function drawRec() {
  const w = recCanvas.width, h = recCanvas.height;
  rc.clearRect(0, 0, w, h);
  rc.fillStyle = '#1d1d1d';
  for (let y = 0; y < h; y += 30) rc.fillRect(0, y, w, 1);
  const bw = 6;
  const n = Math.floor(w / bw);
  const slice = levels.slice(-n);
  slice.forEach((v, i) => {
    const bh = Math.max(2, v * h * .95);
    rc.fillStyle = v > .7 ? '#ff2b1c' : v > .35 ? '#ff5c8a' : '#f3f0e8';
    rc.fillRect(i * bw, (h - bh) / 2, bw - 2, bh);
  });
}
drawRec();

function pickMime() {
  const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return c.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
}

async function startRec() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    recStatus.textContent = 'this browser cannot record. scream manually.';
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) {
    recStatus.textContent = 'mic blocked. the cat cannot hear you.';
    return;
  }
  if (ctx.state === 'suspended') ctx.resume();
  const mime = pickMime();
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  const srcNode = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  srcNode.connect(an);
  const td = new Float32Array(an.fftSize);
  levels.length = 0;
  rec = { mr, stream, srcNode, chunks, mime, peak: -100, loudFrames: 0, frames: 0, t0: performance.now() };
  const loop = () => {
    if (!rec) return;
    an.getFloatTimeDomainData(td);
    let s = 0;
    for (let i = 0; i < td.length; i++) s += td[i] * td[i];
    const r = Math.sqrt(s / td.length);
    const dbfs = 20 * Math.log10(r || 1e-6);
    const spl = Math.max(30, Math.min(140, Math.round(dbfs + 118)));
    rec.peak = Math.max(rec.peak, spl);
    rec.frames++;
    if (spl > 85) rec.loudFrames++;
    recDb.textContent = spl;
    const v = Math.min(1, r * 5);
    levels.push(v);
    micAmp = Math.min(1, r * 2.5);
    drawRec();
    const el = (performance.now() - rec.t0) / 1000;
    recStatus.textContent = `recording ${el.toFixed(1)}s / 15s`;
    if (el >= 15) stopRec(); else requestAnimationFrame(loop);
  };
  mr.onstop = () => finishRec(chunks, mime);
  mr.start();
  recStatus.classList.add('live');
  recBtn.textContent = 'stop';
  recResult.hidden = true;
  loop();
}

function stopRec() {
  if (!rec) return;
  const r = rec;
  r.len = (performance.now() - r.t0) / 1000;
  lastRec = r;
  rec = null;
  micAmp = 0;
  r.mr.stop();
  r.stream.getTracks().forEach(t => t.stop());
  r.srcNode.disconnect();
  recStatus.classList.remove('live');
  recStatus.textContent = 'processing';
  recBtn.textContent = 'record again';
}
let lastRec = null, lastUrl = null;
function finishRec(chunks, mime) {
  const r = lastRec;
  const blob = new Blob(chunks, { type: mime || 'audio/webm' });
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  $('#recAudio').src = lastUrl;
  const dl = $('#recDl');
  dl.href = lastUrl;
  dl.download = 'my-callout.' + (mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm');
  const loudSec = r.loudFrames / Math.max(1, r.frames) * r.len;
  const n = Math.round(loudSec * 16);
  let verdict;
  if (r.peak < 70) verdict = 'that was a whisper. are you even holding?';
  else if (r.peak < 88) verdict = 'mild concern. sounds like a 20% dip';
  else if (r.peak < 104) verdict = 'certified crashout';
  else verdict = 'neighbours have been notified';
  $('#rrPeak').textContent = r.peak + ' dB';
  $('#rrLen').textContent = r.len.toFixed(1) + ' s';
  $('#rrVerdict').textContent = verdict;
  $('#rrTrans').textContent = n >= 3 ? 'A'.repeat(Math.min(n, 300)) : '(silence. suspicious.)';
  recResult.hidden = false;
  recStatus.textContent = 'callout ready';
}
recBtn.addEventListener('click', () => rec ? stopRec() : startRec());

/* ================= T-02 simulator ================= */
const chart = $('#chart'), cc = chart.getContext('2d');
const lossIn = $('#loss'), lossVal = $('#lossVal'), stageLabel = $('#stageLabel');
const stages = [
  [0, 'chart is fine actually'],
  [10, 'mild discomfort'],
  [30, 'refreshing dexscreener'],
  [50, 'texting the dev'],
  [70, 'drafting a voice note'],
  [85, 'full crashout'],
  [95, 'AAAAAAAAAAAAA']
];
function stageFor(v) { let s = stages[0][1]; stages.forEach(([t, l]) => { if (v >= t) s = l; }); return s; }
function updLoss() {
  const v = +lossIn.value;
  lossVal.textContent = v + '%';
  stageLabel.textContent = stageFor(v);
  stageLabel.style.color = v >= 85 ? 'var(--pink)' : '';
}
lossIn.addEventListener('input', updLoss);
updLoss();

let candles = [];
function seedCandles() {
  candles = [];
  let p = 20;
  for (let i = 0; i < 26; i++) {
    const o = p;
    p = p * rnd(1.02, 1.16);
    candles.push({ o, c: p, h: p * rnd(1, 1.05), l: o * rnd(.95, 1) });
  }
}
function drawChart(extra = []) {
  const all = candles.concat(extra);
  const w = chart.width, h = chart.height;
  cc.clearRect(0, 0, w, h);
  cc.fillStyle = '#1b1b1b';
  for (let y = 0; y < h; y += 44) cc.fillRect(0, y, w, 1);
  const max = Math.max(...all.map(c => c.h)) * 1.05;
  const min = Math.min(...all.map(c => c.l)) * .9;
  const y = v => h - 12 - (v - min) / (max - min) * (h - 24);
  const cw = (w - 20) / Math.max(40, all.length);
  all.forEach((c, i) => {
    const x = 10 + i * cw;
    const up = c.c >= c.o;
    cc.fillStyle = cc.strokeStyle = up ? '#f3f0e8' : '#ff2b1c';
    cc.beginPath(); cc.moveTo(x + cw / 2, y(c.h)); cc.lineTo(x + cw / 2, y(c.l)); cc.lineWidth = 1; cc.stroke();
    const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
    cc.fillRect(x + 1, top, cw - 3, Math.max(2, bot - top));
  });
  const last = all[all.length - 1];
  cc.font = '700 14px JetBrains Mono, monospace';
  cc.fillStyle = last.c >= last.o ? '#f3f0e8' : '#ff2b1c';
  cc.textAlign = 'right';
  const pct = ((last.c / candles[candles.length - 1].c - 1) * 100);
  cc.fillText(extra.length ? pct.toFixed(1) + '%' : 'ATH', w - 10, 22);
}
seedCandles();
drawChart();

let simming = false;
$('#checkChart').addEventListener('click', () => {
  if (simming) return;
  simming = true;
  const loss = +lossIn.value / 100;
  seedCandles();
  const top = candles[candles.length - 1].c;
  const target = top * (1 - loss);
  const steps = 14;
  const extra = [];
  let p = top, i = 0;
  const btn = $('#checkChart');
  btn.textContent = 'loading chart...';
  const iv = setInterval(() => {
    const o = p;
    const goal = top - (top - target) * ((i + 1) / steps);
    p = i === steps - 1 ? target : goal * rnd(.93, 1.04);
    extra.push({ o, c: p, h: Math.max(o, p) * rnd(1, 1.02), l: Math.min(o, p) * rnd(.96, 1) });
    drawChart(extra);
    i++;
    if (i >= steps) {
      clearInterval(iv);
      if (loss > .04) {
        const s = scream({ rate: 1.35 - loss * .75, gain: .5 + loss * .7, fx: loss > .9 ? 'distort' : loss > .7 ? 'stadium' : null });
        const r = chart.getBoundingClientRect();
        burst(r.right - 40, r.bottom - 30, Math.round(6 + loss * 40), 30 + loss * 60);
      }
      btn.textContent = loss > .5 ? 'check again (why)' : 'check the chart';
      simming = false;
    }
  }, 70);
});

/* ================= T-03 translator ================= */
const trIn = $('#trIn'), trOut = $('#trOut');
let trDir = 'en';
const catPhrases = [
  'i am completely fine.',
  'the dev has stopped replying to my messages.',
  'i sold the bottom and it did a 40x without me.',
  'please do not look at my wallet.',
  'i have been awake for 41 hours. the chart is still red.',
  'this is not financial advice. this is a cry for help.',
  'i told my family this was a good investment.',
  'one more green candle and i will never trade again. (lie)',
  'who keeps selling. show yourself.',
  'i was early. being early is the same as being wrong.',
  'i need everyone in this chat to stay calm. AAAAAAAAA.',
  'my stop loss was emotional and it did not trigger.'
];
function translate() {
  const v = trIn.value;
  if (trDir === 'en') {
    trOut.classList.remove('en');
    const out = v.replace(/[A-Za-z0-9À-ɏ']+/g, w => 'A'.repeat(Math.max(2, Math.round(w.length * 1.4))));
    trOut.textContent = out.trim() ? out.toUpperCase() + (/[!?.]$/.test(out.trim()) ? '' : '!!') : '';
  } else {
    trOut.classList.add('en');
    const clean = v.replace(/\s+/g, '');
    if (!clean) { trOut.textContent = ''; return; }
    if (/^[aA!?.]+$/.test(clean)) {
      const n = (clean.match(/a/gi) || []).length;
      trOut.textContent = catPhrases[n % catPhrases.length];
    } else {
      trOut.textContent = 'error: this is not cat. this is a person who still has hope.';
    }
  }
}
$$('.tr-lang').forEach(b => b.addEventListener('click', () => {
  $$('.tr-lang').forEach(x => x.classList.toggle('on', x === b));
  trDir = b.dataset.dir;
  if (trDir === 'cat') { trIn.value = 'AAAAAAAAA AAAAAA AAAAAAAAAAAAA'; trIn.placeholder = 'type in cat (A only)'; }
  else { trIn.value = 'the fundamentals are strong and i will not panic'; trIn.placeholder = 'type something rational'; }
  translate();
}));
trIn.addEventListener('input', translate);
translate();
$('#trSpeak').addEventListener('click', () => {
  const len = trIn.value.length;
  scream({ rate: Math.max(.6, 1.3 - len / 160), fx: len > 80 ? 'echo' : null });
});
$('#trCopy').addEventListener('click', e => {
  navigator.clipboard.writeText(trOut.textContent).then(() => {
    e.target.textContent = 'copied';
    setTimeout(() => e.target.textContent = 'copy', 1200);
  });
});

/* ================= T-04 calm button ================= */
const calmBtn = $('#calmBtn'), calmLog = $('#calmLog');
const calmLabels = ['calm down', 'calm down.', 'calm\ndown', 'CALM DOWN', 'CALM DOWN!!', 'C A L M', 'AAAAA', 'AAAAAAAA'];
let calmN = 0;
calmBtn.addEventListener('click', () => {
  calmN++;
  calmBtn.textContent = calmLabels[Math.min(calmN, calmLabels.length - 1)];
  calmBtn.classList.toggle('broken', calmN >= 3);
  const fx = calmN < 2 ? 'underwater' : calmN < 4 ? 'phone' : calmN < 6 ? null : 'stadium';
  scream({ rate: Math.max(.7, 1.25 - calmN * .05), gain: Math.min(1.2, .35 + calmN * .12), fx });
  const r = calmBtn.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, Math.min(40, calmN * 4), 40 + calmN * 4);
  calmLog.textContent = `pressed ${calmN} time${calmN > 1 ? 's' : ''}. still calm: 0%`;
});

/* ================= soundboard ================= */
const padDefs = [
  { n: 'standard callout', d: 'the original', o: {} },
  { n: "baby's first rug", d: 'pitch +70%', o: { rate: 1.7 } },
  { n: 'liquidated', d: 'distortion', o: { fx: 'distort', rate: .95 } },
  { n: 'final form', d: 'pitch -45%', o: { rate: .55 } },
  { n: 'stadium crashout', d: '80,000 seats', o: { fx: 'stadium' } },
  { n: 'calling mom', d: 'bad signal', o: { fx: 'phone', rate: 1.05 } },
  { n: 'echoes of past gains', d: 'delay', o: { fx: 'echo' } },
  { n: 'wish i sold', d: 'reversed', o: { reverse: true } }
];
const padsEl = $('#pads');
const pads = padDefs.map((p, i) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'pad';
  el.innerHTML = `<span class="k">${i + 1}</span><span class="n">${p.n}</span><span class="d">${p.d}</span>`;
  el.addEventListener('click', () => {
    const s = scream(p.o);
    el.classList.add('on');
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 14, 46);
    const ms = buf ? buf.duration / (p.o.rate || 1) * 1000 : 1500;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('on'), ms);
  });
  padsEl.appendChild(el);
  return { el, ...p };
});

/* ================= meme sea ================= */
const water = $('#seaWater');
const MEMES = Array.from({ length: 23 }, (_, i) => `/assets/memes/m${String(i).padStart(2, '0')}.webp`);
const floaters = [];
function buildSea() {
  floaters.forEach(f => f.el.remove());
  floaters.length = 0;
  const W = water.clientWidth, H = water.clientHeight;
  const small = W < 700;
  const order = MEMES.slice().sort(() => Math.random() - .5);
  const lanes = small ? 8 : 6;
  order.forEach((src, i) => {
    const size = small ? rnd(130, 190) : rnd(190, 300);
    const el = document.createElement('div');
    el.className = 'mm';
    el.style.setProperty('--w', size + 'px');
    el.innerHTML = `<img src="${src}" alt="AAAAAAAAAAAAA meme" loading="lazy" width="820" height="820">`;
    water.appendChild(el);
    const lane = i % lanes;
    const dir = lane % 2 ? -1 : 1;
    floaters.push({
      el, size,
      x: rnd(-size, W),
      by: (lane + .5) / lanes * (H - size) + rnd(-30, 30),
      vx: dir * rnd(14, 38),
      ph: rnd(0, Math.PI * 2),
      fr: rnd(.5, 1.1),
      ba: rnd(10, 28),
      ra: rnd(2, 7),
      paused: false
    });
    el.addEventListener('mouseenter', () => floaters[i].paused = true);
    el.addEventListener('mouseleave', () => floaters[i].paused = false);
    el.addEventListener('click', () => openLb(src));
  });
}
let seaOn = false, lastT = 0, seaT = 0;
function seaLoop(t) {
  if (!seaOn) return;
  const dt = Math.min(.05, (t - lastT) / 1000 || 0);
  lastT = t;
  seaT += dt;
  const W = water.clientWidth;
  floaters.forEach(f => {
    const boost = 1 + amp * 6;
    if (!f.paused) f.x += f.vx * dt * boost;
    if (f.x > W + 20) f.x = -f.size - 20;
    if (f.x < -f.size - 20) f.x = W + 20;
    const y = f.by + Math.sin(seaT * f.fr + f.ph) * (f.ba + amp * 40);
    const r = Math.sin(seaT * f.fr * .8 + f.ph) * (f.ra + amp * 12);
    const s = f.paused ? 1.12 : 1;
    f.el.style.transform = `translate3d(${f.x}px,${y}px,0) rotate(${r}deg) scale(${s})`;
  });
  requestAnimationFrame(seaLoop);
}
buildSea();
new IntersectionObserver(es => {
  const vis = es[0].isIntersecting;
  if (vis && !seaOn) { seaOn = true; lastT = performance.now(); requestAnimationFrame(seaLoop); }
  else if (!vis) seaOn = false;
}, { rootMargin: '100px' }).observe(water);
let seaW = water.clientWidth;
addEventListener('resize', () => {
  if (Math.abs(water.clientWidth - seaW) > 80) { seaW = water.clientWidth; buildSea(); }
});

/* ================= lightbox ================= */
const lb = $('#lightbox'), lbImg = $('#lbImg');
function openLb(src) {
  lbImg.src = src;
  lb.hidden = false;
  scream({ rate: rnd(.9, 1.4), gain: .7 });
}
function closeLb() { lb.hidden = true; }
lb.addEventListener('click', e => { if (e.target !== lbImg) closeLb(); });

})();
