import { Component, HostBinding, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { BlogService } from 'src/app/services/blog.service';
import { map, switchMap } from 'rxjs';
import { TranslocoDatePipe } from '@ngneat/transloco-locale';
import { TranslocoPipe } from '@ngneat/transloco';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <h1>{{ "header.projects" | transloco }}</h1>
    <ul>
      <li>
        <h3>
          <a href="https://github.com/ScuroGuardiano/SmartArrayReader" target="_blank">
            Smart Array Reader
          </a>
        </h3>
        <p>{{ "projects.smartArrayReader" | transloco }}</p>
      </li>
      <li>
        <h3>
          <a href="https://github.com/ScuroGuardiano/nextbooru" target="_blank">
            Nextbooru
          </a>
        </h3>
        <p>{{ "projects.nextbooru" | transloco }}</p>
      </li>
    </ul>
  `,
  styles: `
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: .8rem;
    }
  `,
})
export default class ProjectsComponent {
  @HostBinding("class.reading-width")
  readingWidthClass = true;
}
