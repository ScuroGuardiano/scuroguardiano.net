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
export class AppComponent {
  constructor(changeDetectorRef: ChangeDetectorRef, router: Router) {
    // I guess AnalogJS have some error that makes routing outsige ng zone
    // So I must add this here and if I am loading any dynamic data
    // inside my pages then I must call `detectChanges` there aswell. I am clueless why.
    router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        changeDetectorRef.detectChanges();
      }
    });
  }
}
