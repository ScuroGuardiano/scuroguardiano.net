import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { HamburgerMenuComponent } from "../components/hamburger-menu/hamburger-menu.component";
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';

@Component({
    selector: 'app-layout',
    standalone: true,
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    imports: [
        RouterLink,
        TranslocoPipe,
        HamburgerMenuComponent,
        AsyncPipe,
        NgTemplateOutlet
    ]
})
export class LayoutComponent {
  #translocoService = inject(TranslocoService);

  currentLang$ = this.#translocoService.langChanges$;

  changeLang() {
    // Yeah ugly, idc, I will ever support only those 2 languages, so I can hardcore it like that
    this.#translocoService.setActiveLang(
      this.#translocoService.getActiveLang() == "pl" ? "en" : "pl"
    );
  }
}
