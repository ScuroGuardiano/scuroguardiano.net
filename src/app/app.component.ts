import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LayoutComponent } from "./layout/layout.component";
import { ParticlesComponent } from './components/particles/particles.component';

@Component({
    selector: 'app-root',
    standalone: true,
    template: `
    <app-particles/>
    <app-layout>
      <router-outlet></router-outlet>
    </app-layout>
  `,
    styles: `app-particles { z-index: -1 }`,
    imports: [RouterOutlet, LayoutComponent, ParticlesComponent]
})
export class AppComponent {}
