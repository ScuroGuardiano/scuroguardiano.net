import { IParticle } from "./particles-controller";

export default interface IRenderer {
  render(particles: IParticle[]): void;
  onResize(): void;
}
