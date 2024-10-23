import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhysicsRoutingModule } from './physics-routing.module';
import { PhysicsComponent } from './views/physics/physics.component';
import { RouterModule, RouterOutlet } from '@angular/router';


@NgModule({
  declarations: [
    PhysicsComponent
  ],
  imports: [
    CommonModule,
    PhysicsRoutingModule
  ]
})
export class PhysicsModule { }
