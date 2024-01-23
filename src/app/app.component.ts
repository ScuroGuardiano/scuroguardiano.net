import { Component, PLATFORM_ID, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from "./layout/layout.component";
import { ParticlesComponent } from './components/particles/particles.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
    selector: 'app-root',
    standalone: true,
    template: `
    <app-particles/>
    <app-layout>
      <router-outlet></router-outlet>
    </app-layout>
  `,
    styles: [],
    imports: [RouterOutlet, LayoutComponent, ParticlesComponent]
})
export class AppComponent {}
