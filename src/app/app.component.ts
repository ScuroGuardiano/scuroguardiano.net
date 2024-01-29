import { Component, HostListener, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LayoutComponent } from "./layout/layout.component";
import { ParticlesComponent } from './components/particles/particles.component';
import { filter, map } from 'rxjs';
import { AsyncPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { TranslocoService } from '@ngneat/transloco';

@Component({
    selector: 'app-root',
    standalone: true,
    template: `

    @if (!(particlesDisabled$ | async)) {
      <app-particles [particles]="getParticlesCount()"/>
    }
    <app-layout>
      <router-outlet></router-outlet>
    </app-layout>
  `,
    styles: `app-particles { z-index: -1 }`,
    imports: [RouterOutlet, LayoutComponent, ParticlesComponent, AsyncPipe]
})
export class AppComponent implements OnInit {
  #router = inject(Router);
  #platformId = inject(PLATFORM_ID);
  #document = inject(DOCUMENT);
  #transoloco = inject(TranslocoService);

  ngOnInit(): void {
    this.#transoloco.langChanges$.subscribe(l => {
      this.#document.documentElement.lang = l;
    })
  }

  particlesDisabled$ = this.#router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(event => {
      return this.#shouldParticlesBeDisabledToNotFuckinAnnoyReaders((event as NavigationEnd).url)
    })
  );

  #shouldParticlesBeDisabledToNotFuckinAnnoyReaders(url: string) {
    return this.#disableParticlesConditions.some(cond => cond(url));
  }

  #disableParticlesConditions: ((url: string) => boolean)[] = [
    url => /^\/blog\/.+/gm.test(url),
    url => /^\/projects\/.+/gm.test(url)
  ];

  getParticlesCount() {
    if (!isPlatformBrowser(this.#platformId)) {
      return 0;
    }
    const screenArea = window.screen.width * window.screen.height;
    // if (screenArea < 500_000) {
    //   // On small screens let's just disable particles.
    //   return 0;
    // }

    return Math.round(screenArea / 50000);
  }

  @HostListener("window:resize")
  windowResize() {}
}
