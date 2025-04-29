import { Component } from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';

@Component({
    selector: 'app-featured-projects',
    imports: [TranslocoPipe],
    templateUrl: './featured-projects.component.html',
    styleUrl: './featured-projects.component.scss'
})
export class FeaturedProjectsComponent {

}
