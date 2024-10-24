import { Component } from '@angular/core';
import { IPlotInit } from '../../components/plot/plot.component';

@Component({
  selector: 'app-linear-plot',
  templateUrl: './linear-plot.component.html',
  styleUrl: './linear-plot.component.scss'
})
export class LinearPlotComponent {

  readonly plotInit: IPlotInit = {
    xAxis: {
      start: 0,
      end: 10,
      label: "U [V]",
      rulers: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    yAxis: {
      start: 0,
      end: 10,
      label: "I [mA]",
      rulers: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    lines: [
      { a: 1, b: 0 }
    ],
    points: [
      { x: 2.5, y: 5 },
      { x: 4, y: 2 }
    ],
    ux: 0.05,
    uy: 0.05
  }
}
