import { Component, computed, ElementRef, input, ViewChild } from '@angular/core';

@Component({
  selector: 'app-plot',
  templateUrl: './plot.component.html',
  styleUrl: './plot.component.scss'
})
export class PlotComponent {
  @ViewChild("svg") svgEl: ElementRef<SVGElement> = null!;

  getSVG() {
    return this.svgEl.nativeElement.outerHTML;
  }

  readonly plotMarginPercent = 5;
  readonly plotViewBox = { width: 2970, height: 2100 };
  readonly uncertaintyEndingLineHalfLen = 0.3;
  readonly rulerHalfLineLen = 1;
  readonly xAxisRulerLabelOffset = { x: .25, y: 2.5 };
  readonly yAxisRulerLabelOffset = { x: -1.5, y: .3 };

  plotInit = input.required<Required<IPlotInit>, IPlotInit>({
    transform: (v => ({ ...defaultPlotInit, ...v }))
  });

  xAxis = computed(() => ({ ...defaultAxis, ...this.plotInit().xAxis }));
  yAxis = computed(() => ({ ...defaultAxis, ...this.plotInit().yAxis }));

  lines = computed(() => [ ...this.rulerLines(), ...this.plottedLines(), ...this.errorLines() ]);
  labels = computed(() => this.rulerLabels());

  rulerLines = computed(() => {
    const lines = [] as SVGLine[];
    const bottomAxisY = 100 - this.plotMarginPercent;
    const leftAxisX = this.plotMarginPercent;

    for (const ruler of this.xAxis().rulers) {
      const mapped = this.mapPointToSVG(ruler, 0).x;
      const axisRuler = {
        x1: mapped,
        x2: mapped,
        y1: bottomAxisY - this.rulerHalfLineLen,
        y2: bottomAxisY + this.rulerHalfLineLen,
        class: "ruler-axis"
      };

      const plotRuler = {
        x1: mapped,
        x2: mapped,
        y1: axisRuler.y2,
        y2: this.plotMarginPercent,
        class: "ruler-plot"
      }

      lines.push(axisRuler, plotRuler);
    }

    for (const ruler of this.yAxis().rulers) {
      const mapped = this.mapPointToSVG(0, ruler).y;
      const axisRuler = {
        x1: leftAxisX - this.rulerHalfLineLen,
        x2: leftAxisX + this.rulerHalfLineLen,
        y1: mapped,
        y2: mapped,
        class: "ruler-axis"
      };

      const plotRuler = {
        x1: axisRuler.x2,
        x2: 100 - this.plotMarginPercent,
        y1: mapped,
        y2: mapped,
        class: "ruler-plot"
      }

      lines.push(axisRuler, plotRuler);
    }

    return lines;
  });

  rulerLabels = computed(() => {
    const labels = [] as SVGLabel[];
    const bottomAxisY = 100 - this.plotMarginPercent;
    const leftAxisX = this.plotMarginPercent;

    for (const ruler of this.xAxis().rulers) {
      const mapped = this.mapPointToSVG(ruler, 0).x;
      const label: SVGLabel = {
        x: mapped + this.xAxisRulerLabelOffset.x,
        y: bottomAxisY + this.xAxisRulerLabelOffset.y,
        class: "ruler-label",
        text: ruler.toString()
      };
      labels.push(label);
    }

    for (const ruler of this.yAxis().rulers) {
      const mapped = this.mapPointToSVG(0, ruler).y;
      const label: SVGLabel = {
        x: leftAxisX + this.yAxisRulerLabelOffset.x,
        y: mapped + this.yAxisRulerLabelOffset.y,
        class: "ruler-label",
        text: ruler.toString()
      };
      labels.push(label);
    }

    return labels;
  });

  plottedLines = computed(() => {
    const initLines = this.plotInit().lines;
    const startX = this.xAxis().start;
    const endX = this.xAxis().end;

    return initLines.map(line => {
      const startPoint = this.mapPointToSVG(startX, line.a * startX + line.b);
      const endPoint = this.mapPointToSVG(endX, line.a * endX + line.b);

      return {
        x1: startPoint.x,
        y1: startPoint.y,
        x2: endPoint.x,
        y2: endPoint.y,
        class: "plotted-line"
      }
    });
  });

  points = computed(() => {
    const initPoints = this.plotInit().points;
    return initPoints.map(point => this.mapPointToSVG(point.x, point.y));
  });

  errorLines = computed(() => {
    const { ux, uy } = this.mapUncertaintyToSVG(this.plotInit().ux, this.plotInit().uy);
    const lines = [] as SVGLine[];
    const xd = this.uncertaintyEndingLineHalfLen;

    if (ux !== 0) {
      for (const point of this.points()) {
        const mainLine = { x1: point.x - ux, x2: point.x + ux, y1: point.y, y2: point.y, class: "error" };
        const leftEnd = { x1: mainLine.x1, x2: mainLine.x1, y1: mainLine.y1 - xd, y2: mainLine.y2 + xd, class: "error end" };
        const rightEnd = { x1: mainLine.x2, x2: mainLine.x2, y1: mainLine.y1 - xd, y2: mainLine.y2 + xd, class: "error end" };

        lines.push(mainLine, leftEnd, rightEnd);
      }
    }

    if (uy !== 0) {
      for (const point of this.points()) {
        const mainLine = { x1: point.x, x2: point.x, y1: point.y - uy, y2: point.y + uy, class: "error" };
        const topEnd = { x1: mainLine.x1 - xd, x2: mainLine.x1 + xd, y1: mainLine.y1, y2: mainLine.y1, class: "error end" };
        const bottomEnd = { x1: mainLine.x2 - xd, x2: mainLine.x2 + xd, y1: mainLine.y2, y2: mainLine.y2, class: "error end" };

        lines.push(mainLine, topEnd, bottomEnd);
      }
    }

    return lines;
  });

  mapPointToSVG(x: number, y: number): { x: number, y: number } {
    const drawAreaPercent = 100 - this.plotMarginPercent * 2;
    const xResolution = this.xAxis().end - this.xAxis().start;
    const yResolution = this.yAxis().end - this.yAxis().start;

    const partOnX = x / xResolution;
    const partOnY = 1 - y / yResolution;

    return {
      x: partOnX * drawAreaPercent + this.plotMarginPercent,
      y: partOnY * drawAreaPercent + this.plotMarginPercent
    }
  }

  mapUncertaintyToSVG(ux: number, uy: number): { ux: number, uy: number } {
    const drawAreaPercent = 100 - this.plotMarginPercent * 2;
    const xResolution = this.xAxis().end - this.xAxis().start;
    const yResolution = this.yAxis().end - this.yAxis().start;

    const partOnX = ux / xResolution;
    const partOnY = uy / yResolution;

    return {
      ux: partOnX * drawAreaPercent,
      uy: partOnY * drawAreaPercent
    }
  }
}

export interface IPlotAxis {
  label?: string,
  start?: number,
  end?: number,
  rulers?: number[]
}

const defaultAxis = Object.freeze({
  label: "",
  start: 0,
  end: 1,
  rulers: []
} as Required<IPlotAxis>);

export interface IPlotLine {
  a: number;
  b: number;
}

export interface IPlotPoint {
  x: number;
  y: number;
}

export interface IPlotInit {
  xAxis?: IPlotAxis;
  yAxis?: IPlotAxis;
  lines?: IPlotLine[];
  points?: IPlotPoint[];
  ux?: number; // niepewność x
  uy?: number; // niepewność y
}

const defaultPlotInit = Object.freeze({
  xAxis: defaultAxis,
  yAxis: defaultAxis,
  lines: [],
  points: [],
  ux: 0,
  uy: 0
} as Required<IPlotInit>);

interface SVGLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  class: string;
}

interface SVGLabel {
  x: number;
  y: number;
  class: string;
  text: string;
}
