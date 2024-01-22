import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from "./layout/layout.component";

@Component({
    selector: 'app-root',
    standalone: true,
    template: `
    <app-layout>
      <router-outlet></router-outlet>
    </app-layout>
  `,
    styles: [],
    imports: [RouterOutlet, LayoutComponent]
})
export class AppComponent {}
