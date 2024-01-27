import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterLink,
    TranslocoPipe
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {

}
