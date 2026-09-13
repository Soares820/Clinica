import "@testing-library/jest-dom/vitest";

// jsdom não implementa contexto 2D de canvas nem requestAnimationFrame de
// verdade. O app desenha um fundo animado (AuroraBackdrop) em todo carregamento
// de página — sem esses stubs, qualquer teste que monte <App /> quebra por causa
// de um efeito visual que não tem relação nenhuma com login/autenticação.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    setTransform() {},
  });
}
if (typeof window !== "undefined") {
  window.requestAnimationFrame = window.requestAnimationFrame || (() => 0);
  window.cancelAnimationFrame = window.cancelAnimationFrame || (() => {});
}
