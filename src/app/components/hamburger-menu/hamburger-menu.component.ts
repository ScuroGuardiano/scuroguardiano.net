import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';

@Component({
    selector: 'app-hamburger-menu',
    imports: [],
    templateUrl: './hamburger-menu.component.html',
    styleUrl: './hamburger-menu.component.scss'
})
export class HamburgerMenuComponent {
  menuOpened = signal(false);
  #elementRef = inject(ElementRef) as ElementRef<HTMLElement>;

  toggle() {
    this.menuOpened.set(!this.menuOpened());
  }

  off() {
    this.menuOpened.set(false);
  }

  @HostListener("document:click", ['$event'])
  onDocumentClick(event: Event) {
    if (event.target instanceof Node) {
      if (!this.#elementRef.nativeElement.contains(event.target)) {
        this.off();
      };
    }
  }
}
