import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { Subscription } from 'rxjs';

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
export default class ProjectsComponent implements OnInit, OnDestroy {
  @HostBinding("class.reading-width")
  readingWidthClass = true;

  #title = inject(Title);
  #translocoService = inject(TranslocoService);
  subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(this.#translocoService.selectTranslate("header.projects").subscribe(t => {
      this.setTitle(t);
    }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  setTitle(projects: string) {
    this.#title.setTitle(`${projects} · Scuro Guardiano`);
  }
}
