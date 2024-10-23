import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhysicsComponent } from './views/physics/physics.component';
import { LinearApproximationComponent } from './views/linear-approximation/linear-approximation.component';

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
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhysicsRoutingModule { }
