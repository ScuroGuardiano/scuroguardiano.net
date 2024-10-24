import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhysicsRoutingModule } from './physics-routing.module';
import { PhysicsComponent } from './views/physics/physics.component';
import { RouterModule, RouterOutlet } from '@angular/router';
import { LinearPlotComponent } from './views/linear-plot/linear-plot.component';
import { PlotComponent } from './components/plot/plot.component';


@NgModule({
  declarations: [
    PhysicsComponent,
    LinearPlotComponent,
    PlotComponent
  ],
  imports: [
    CommonModule,
    PhysicsRoutingModule
  ]
})
export class PhysicsModule { }
