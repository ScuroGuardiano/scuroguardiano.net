import { Component, inject } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-physics',
  templateUrl: './physics.component.html',
  styleUrl: './physics.component.scss'
})
export class PhysicsComponent {
  #transolocoService = inject(TranslocoService);

  readonly menu = [
    { title: "Aproksymacja liniowa", routerLink: "line-approximation" },
    // { title: "Wykres liniowy", routerLink: "plot" },
  ]
}
