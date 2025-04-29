import { AfterViewInit, Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import katex from "katex";
import lineApprox from 'src/app/features/algorithms/linear-approximation';

@Component({
    selector: 'app-linear-approximation',
    templateUrl: './linear-approximation.component.html',
    styleUrl: './linear-approximation.component.scss',
    standalone: false
})
export class LinearApproximationComponent implements AfterViewInit {
  @ViewChild("inputField") inputField: ElementRef<HTMLTextAreaElement> = null!;

  #sanitizer = inject(DomSanitizer);
  input = signal<{ x: number, y: number }[]>([]);
  error = signal<string>("");
  inputValid = computed(() => this.error() === "" && this.input().length > 2);
  result = computed(() => lineApprox(this.input()));
  katexOut = computed(() => this.resultToKatex(this.result()));
  detailedKatex = computed(() => this.detailedToKatex(this.result()));
  detailedVisible = signal(false);

  ngAfterViewInit(): void {
    this.handleChange(this.inputField.nativeElement);
  }

  handleChange(el: HTMLTextAreaElement) {
    this.error.set("");
    const data = el.value
      .replaceAll("\r", "")
      .replaceAll(",", ".")
      .split("\n")
      .filter(line => line.trim() !== "")
      .map(row => row.split(/\s+/))
      .map(row => ({ x: parseFloat(row[0]), y: parseFloat(row[1]) }));

    if (this.validateData(data)) {
      this.input.set(data);
    }
  }

  validateData(data: { x: number, y: number }[]) {
    let errorLine = 0;
    let errorVars = [];

    for (let i = 0; i < data.length; i++) {
      const pair = data[i];
      if (isFinite(pair.x) && isFinite(pair.y)) {
        continue;
      }

      errorLine = i + 1;
      if (!isFinite(pair.x)) {
        errorVars.push("x");
      }
      if (!isFinite(pair.y)) {
        errorVars.push("y");
      }
      break;
    }

    if (errorLine) {
      this.error.set(`[Row ${errorLine}]: Invalid ${errorVars.join(", ")}`);
      return false;
    }
    return true;
  }

  katexRenderEquation(tex: string) {
    return katex.renderToString(tex, { throwOnError: false, output: "mathml", displayMode: true });
  }

  resultToKatex(res: ReturnType<typeof lineApprox>) {
    const tex = `\\begin{align}
    a&=${res.a} \\\\
    b&=${res.b} \\\\
    u(a)&=${res.ua} \\\\
    u(b)&=${res.ub}
    \\end{align}`

    return this.#sanitizer.bypassSecurityTrustHtml(this.katexRenderEquation(tex));
  }

  detailedToKatex(res: ReturnType<typeof lineApprox>) {
    const tex = `\\begin{align*}
    \\sum_{i=1}^{${res.n}} x_i &= ${res.sumX} \\\\
    \\sum_{i=1}^{${res.n}} y_i &= ${res.sumY} \\\\
    \\sum_{i=1}^{${res.n}} x_i y_i &= ${res.sumXY} \\\\
    \\sum_{i=1}^{${res.n}} x_i^2 &= ${res.sumXSq} \\\\
    a = \\frac{${res.sumX} * ${res.sumY} - ${res.n} * ${res.sumXY}}{${res.sumX! ** 2} - ${res.n} * ${res.sumXSq}} = \\frac{${res.upperA}}{${res.bottom}} &= ${res.a} \\\\
    b = \\frac{${res.sumX} * ${res.sumXY} - ${res.sumY} * ${res.sumXSq}}{${res.sumX! ** 2} - ${res.n} * ${res.sumXSq}} = \\frac{${res.upperB}}{${res.bottom}} &= ${res.b} \\\\
    \\sum_{i=1}^{${res.n}} y_i^2 &= ${res.sumYSq} \\\\
    \\sum_{i=1}^{${res.n}} d_i^2 = ${res.sumYSq} - ${res.a} * ${res.sumXY} - ${res.b} * ${res.sumY} &= ${res.sumDSq} \\\\
    u(a) = \\sqrt{\\frac{1}{${res.n} - 2} * ${res.sumDSq}} * \\sqrt{\\frac{${res.n}}{${res.n} * ${res.sumXSq} - (${res.sumX})^2}} &= ${res.ua} \\\\
    u(b) = \\sqrt{\\frac{1}{${res.n} - 2} * ${res.sumDSq}} * \\sqrt{\\frac{${res.sumXSq}}{${res.n} * ${res.sumXSq} - (${res.sumX})^2}} &= ${res.ub}
    \\end{align*}`

    return this.#sanitizer.bypassSecurityTrustHtml(this.katexRenderEquation(tex));
  }
}
