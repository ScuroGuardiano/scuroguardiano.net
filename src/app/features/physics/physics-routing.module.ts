import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhysicsComponent } from './views/physics/physics.component';
import { LinearApproximationComponent } from './views/linear-approximation/linear-approximation.component';
import { LinearPlotComponent } from './views/linear-plot/linear-plot.component';

const routes: Routes = [
  {
    path: '',
    component: PhysicsComponent,
    children: [
      {
        path: '',
        redirectTo: 'linear-approximation',
        pathMatch: 'full'
      },
      {
        path: 'linear-approximation',
        component: LinearApproximationComponent
      },
      {
        path: 'linear-plot',
        component: LinearPlotComponent
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhysicsRoutingModule { }
