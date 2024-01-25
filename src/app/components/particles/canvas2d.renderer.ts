import { IParticle } from "./particles-controller";
import IRenderer from "./renderer";

export default class Canvas2DRenderer implements IRenderer {
  constructor(canvasElement: HTMLCanvasElement) {
    this.#canvas = canvasElement;
    this.resizeCanvasToDisplaySize();
    const context = canvasElement.getContext('2d');
    if (!context) {
      throw new Error("Can't get 2D context.");
    }
    this.#context = context;
  }

  #canvas: HTMLCanvasElement;
  #context: CanvasRenderingContext2D;

  render(particles: IParticle[]): void {
    const ctx = this.#context;
    const { width, height } = ctx.canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgb(255, 255, 255)";

    particles.forEach(p => {
      const opacity = 0.3 * p.fade;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(
        p.x * width,
        p.y * height,
        p.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.closePath();
    });
  }

  public onResize() {
    this.resizeCanvasToDisplaySize();
  }

  private resizeCanvasToDisplaySize() {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth  = this.#canvas.clientWidth;
    const displayHeight = this.#canvas.clientHeight;

    // Check if the canvas is not the same size.
    const needResize = this.#canvas.width  !== displayWidth ||
                       this.#canvas.height !== displayHeight;

    if (needResize) {
      // Make the canvas the same size
      this.#canvas.width  = displayWidth;
      this.#canvas.height = displayHeight;
    }

    return needResize;
  }
}

