import { html } from 'htm/preact';
import { useEffect, useRef, useState } from 'preact/hooks';

const VIDEO = '/media/verdict/campfire-loop.mp4';
const POSTER = '/media/verdict/campfire-poster.webp';
const VERTEX = `
  attribute vec2 position;
  varying mediump vec2 uv;
  void main() { uv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;
const FRAGMENT = `
  precision mediump float;
  uniform sampler2D footage;
  uniform float fit;
  varying mediump vec2 uv;
  void main() {
    vec2 p = vec2((uv.x - 0.5) * fit + 0.5, uv.y);
    if (p.x < 0.0 || p.x > 1.0) { gl_FragColor = vec4(0.0); return; }
    vec3 color = texture2D(footage, p).rgb;
    // Retirer le noir de la captation, sans rectangle autour des flammes.
    float density = length(color) / 1.7320508;
    float alpha = clamp((density - 0.08) / 0.18, 0.0, 1.0);
    float edge = smoothstep(0.0, 0.035, p.x) * (1.0 - smoothstep(0.965, 1.0, p.x));
    edge *= smoothstep(0.0, 0.025, p.y) * (1.0 - smoothstep(0.975, 1.0, p.y));
    gl_FragColor = vec4(color, alpha * edge);
  }
`;

/** Captation réelle, fond noir retiré sur le GPU, sans simulation de flammes. */
export function VerdictFire() {
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const motionRef = useRef(null);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current, video = videoRef.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let gl, program, buffer, texture, fit;
    let frame = null, last = 0, visible = !('IntersectionObserver' in window), failed = false, disposed = false;

    function shader(type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('Shader indisponible'); }
      return s;
    }
    function graphics() {
      if (gl) return true;
      try {
        gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, preserveDrawingBuffer: true });
        if (!gl) return false;
        const vertex = shader(gl.VERTEX_SHADER, VERTEX), fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
        program = gl.createProgram();
        gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
        gl.deleteShader(vertex); gl.deleteShader(fragment);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
        gl.useProgram(program);
        buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.uniform1i(gl.getUniformLocation(program, 'footage'), 0);
        fit = gl.getUniformLocation(program, 'fit');
        resize();
        return true;
      } catch { return false; }
    }
    function draw() {
      if (!gl || video.readyState < 2 || failed) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform1f(fit, (canvas.width / canvas.height) / (video.videoWidth / video.videoHeight));
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        root.dataset.state = 'playing';
      } catch { fallback(); }
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (gl) { gl.viewport(0, 0, canvas.width, canvas.height); if (!media.matches) draw(); }
    }
    function stop() { cancelAnimationFrame(frame); frame = null; video.pause(); }
    function fallback() { failed = true; stop(); root.dataset.state = 'poster'; }
    function tick(now) {
      if (disposed || failed || media.matches || document.hidden || !visible || pausedRef.current) return;
      const elapsed = now - last;
      if (elapsed >= 1000 / 30) { last = now - (elapsed % (1000 / 30)); draw(); }
      frame = requestAnimationFrame(tick);
    }
    function motion() {
      stop();
      if (disposed || failed || media.matches || document.hidden || !visible) {
        root.dataset.state = 'poster'; return;
      }
      if (pausedRef.current) {
        if (root.dataset.state === 'playing') root.dataset.state = 'paused';
        return;
      }
      if (!graphics()) { fallback(); return; }
      if (!video.getAttribute('src')) video.src = VIDEO;
      video.play().then(() => {
        if (disposed || failed || media.matches || document.hidden || !visible || pausedRef.current) { video.pause(); return; }
        cancelAnimationFrame(frame); last = 0; frame = requestAnimationFrame(tick);
      }).catch(() => { if (!disposed) { stop(); root.dataset.state = 'poster'; } });
    }
    function contextLost(event) { event.preventDefault(); fallback(); }
    video.muted = true; video.loop = true; video.playsInline = true;
    video.addEventListener('error', fallback);
    canvas.addEventListener('webglcontextlost', contextLost);
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root);
    const visibilityObserver = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      if (visible !== entry.isIntersecting) { visible = entry.isIntersecting; motion(); }
    }, { threshold: 0 }) : null;
    visibilityObserver?.observe(root);
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', motion);
    motionRef.current = motion;
    motion();
    return () => {
      motionRef.current = null;
      disposed = true; stop();
      resizeObserver.disconnect(); visibilityObserver?.disconnect();
      media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', motion);
      canvas.removeEventListener('webglcontextlost', contextLost); video.removeEventListener('error', fallback);
      video.removeAttribute('src'); video.load();
      if (gl) { gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); }
    };
  }, []);
  return html`<div ref=${rootRef} class="verdict-fire" data-state="poster">
    <span class="verdict-fire-light" aria-hidden="true"></span>
    <img class="verdict-fire-poster" src=${POSTER} alt="" width="360" height="500" />
    <canvas ref=${canvasRef} aria-hidden="true"></canvas>
    <img class="verdict-fire-base" src="/media/verdict/ember-bed.webp" alt="" width="800" height="250" />
    <button type="button" class="verdict-fire-control" aria-label=${paused ? "Reprendre l’animation du bûcher" : "Mettre l’animation du bûcher en pause"} onClick=${() => { pausedRef.current = !paused; setPaused(!paused); motionRef.current?.(); }}>${paused ? 'Reprendre' : 'Pause'}</button>
    <video ref=${videoRef} class="verdict-fire-source" muted playsinline loop preload="none" tabindex="-1" aria-hidden="true"></video>
  </div>`;
}
