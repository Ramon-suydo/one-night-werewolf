export function benchmarkGPU() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'low-power' }); if (!gl) return false;
  const start = performance.now(); gl.enable(gl.SCISSOR_TEST);
  for (let i = 0; i < 80; i++) { gl.scissor(i % 64, i % 64, 32, 32); gl.clearColor(i / 80, .2, .3, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
  gl.finish(); const passed = performance.now() - start < (innerWidth < 700 ? 35 : 100);
  gl.getExtension('WEBGL_lose_context')?.loseContext(); return passed;
}
