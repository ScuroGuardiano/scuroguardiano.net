import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { HamburgerMenuComponent } from "../components/hamburger-menu/hamburger-menu.component";

@Component({
    selector: 'app-layout',
    standalone: true,
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    imports: [
        RouterLink,
        TranslocoPipe,
        HamburgerMenuComponent
    ]
})
export class LayoutComponent {

}
