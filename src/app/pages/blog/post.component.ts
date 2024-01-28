import { Component, HostBinding, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { BlogService } from 'src/app/services/blog.service';
import { map, switchMap, tap } from 'rxjs';
import { TranslocoDatePipe } from '@ngneat/transloco-locale';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [AsyncPipe, TranslocoDatePipe],
  template: `
    @if (post$ | async; as post) {
      <article>
        <h1>{{ post.metadata.languageVersions[0].title }}</h1>
        <div class="second-line">
          <span class="date">{{ post.metadata.date | translocoDate:{ dateStyle: 'long' } }}</span>
        </div>
        <hr>
        <div [innerHTML]="post.content"></div>
      </article>
    }
  `,
  styles: `
    :host {
      background-color: var(--bg-2);
      padding: 2rem;
    }
  `,
})
export default class PostComponent {
  @HostBinding("class.reading-width")
  readingWidthClass = true;

  #blogService = inject(BlogService);

  #route = inject(ActivatedRoute);
  path$ = this.#route.paramMap.pipe(map(p => p.get('path')!));
  post$ = this.path$.pipe(
    switchMap(path => this.#blogService.getPostWithContent(path))
  );
}
