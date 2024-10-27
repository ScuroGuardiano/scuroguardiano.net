import { Component } from '@angular/core';
import { IPlotInit, IPlotLine, PlotComponent } from '../../components/plot/plot.component';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-linear-plot',
  templateUrl: './linear-plot.component.html',
  styleUrl: './linear-plot.component.scss',
})
export class LinearPlotComponent {
  formGroup = new FormGroup({
    lineA: new FormControl<number>(0, Validators.required),
    lineB: new FormControl<number>(0, Validators.required),
    errorX: new FormControl<number | null>(null),
    errorY: new FormControl<number | null>(null),
    points: new FormControl<string | null>(null, this.pointsValidator.bind(this)),
    axisXLabel: new FormControl<string>(''),
    axisXStart: new FormControl<number>(0, Validators.required),
    axisXEnd: new FormControl<number>(1, Validators.required),
    axisXRulers: new FormControl<string>('', this.rulersValidator.bind(this)),
    axisYLabel: new FormControl<string>(''),
    axisYStart: new FormControl<number>(0, Validators.required),
    axisYEnd: new FormControl<number>(1, Validators.required),
    axisYRulers: new FormControl<string>('', this.rulersValidator.bind(this)),
  });

  readonly plotInit$: Observable<IPlotInit> = this.formGroup.valueChanges.pipe(
    map(v => {
      const lines = [] as IPlotLine[];
      if (v.lineA) {
        lines.push({ a: v.lineA, b: v.lineB ?? 0 });
      }

      return {
        xAxis: {
          label: v.axisXLabel ?? "",
          start: v.axisXStart ?? 0,
          end: v.axisXEnd ?? 1,
          rulers: this.parseRuler(v.axisXRulers ?? '').filter(x => isFinite(x))
        },
        yAxis: {
          label: v.axisYLabel ?? "",
          start: v.axisYStart ?? 0,
          end: v.axisYEnd ?? 1,
          rulers: this.parseRuler(v.axisYRulers ?? '').filter(x => isFinite(x))
        },
        lines,
        points: this.parsePoints(v.points ?? '').filter(p => isFinite(p.x) && isFinite(p.y)),
        ux: v.errorX ?? 0,
        uy: v.errorY ?? 0,
      };
    })
  );

  readonly svgPrintStyles = `
  <style>
    .label, .ruler-label {
      font: 24px sans-serif;
      fill: black;
    }

    .axis, .error, .plotted-line, .ruler-axis {
      stroke: black;
    }

    .ruler-plot {
      stroke: rgba(0, 0, 0, 0.2);
    }

    .point {
      fill: black;
    }
  </style>`.split("\n").map(line => line.trim()).join('');

  downloadSVG(plotComponent: PlotComponent) {
    let svg = plotComponent.getSVG();
    const insertPos = svg.indexOf('>');
    svg = svg.substring(0, insertPos) + '>' + this.svgPrintStyles + svg.substring(insertPos + 1);

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const urlObj = URL.createObjectURL(blob);
    let tab = window.open();
    tab!.location.href = urlObj;
  }

  private rulersValidator(control: AbstractControl) {
    if (!control.value) {
      return null;
    }

    if (typeof control.value !== 'string') {
      return { invalidRulers: { value: control.value } }
    }

    if (this.parseRuler(control.value).some(v => !isFinite(v))) {
      return { invalidRulers: { value: control.value } }
    }

    return null;
  }

  private pointsValidator(control: AbstractControl) {
    if (!control.value) {
      return null;
    }

    if (typeof control.value !== 'string') {
      return { invalidPoints: { value: control.value } }
    }


    if (this.parsePoints(control.value).some(row => !isFinite(row.x) || !isFinite(row.y))) {
      return { invalidPoints: { value: control.value } }
    }

    return null;
  }

  private parseRuler(data: string) {
    return data.trim().split(/\s+/).map(v => parseFloat(v.replace(",", ".")));
  }

  private parsePoints(data: string) {
    return data
      .replaceAll("\r", "")
      .split("\n")
      .filter(line => line.trim() !== "")
      .map(row => row.split(/\s+/))
      .map(row => ({
        x: parseFloat(row[0].replace(",", ".")),
        y: parseFloat(row[1].replace(",", ".")),
        ux: row[2] ? parseFloat(row[2].replace(",", ".")) : 0,
        uy: row[3] ? parseFloat(row[3].replace(",", ".")) : 0
      }));
  }
}
