import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { BlogService } from 'src/app/services/blog.service';
import { map, switchMap, tap } from 'rxjs';
import { TranslocoDatePipe } from '@ngneat/transloco-locale';
import { Title } from '@angular/platform-browser';
import { SeoService } from 'src/app/services/seo.service';

@Component({
    selector: 'app-blog-post',
    imports: [AsyncPipe, TranslocoDatePipe],
    template: `
    @if (post$ | async; as post) {
      <article class="blog-post">
        <h1>{{ post.metadata.languageVersions[0].title }}</h1>
        <div class="second-line">
          <span class="date">{{ post.metadata.date | translocoDate:{ dateStyle: 'long' } }}</span>
        </div>
        <hr>
        <div class="post-content" [innerHTML]="post.content"></div>
      </article>
    }
  `,
    styles: `
    :host {
      display: block;
      background-color: var(--bg-2);
      padding: 0 1rem;
    }
  `
})
export default class PostComponent implements OnDestroy {
  @HostBinding("class.reading-width")
  readingWidthClass = true;

  #blogService = inject(BlogService);
  #title = inject(Title);
  #seoService = inject(SeoService);
  #route = inject(ActivatedRoute);

  path$ = this.#route.paramMap.pipe(map(p => p.get('path')!));
  post$ = this.path$.pipe(
    switchMap(path => this.#blogService.getPostWithContent(path)),
    tap(p => {
      this.#title.setTitle(`${p.metadata.languageVersions[0].title} · Scuro Guardiano`);
      this.#seoService.postSEO(p.metadata, p.metadata.languageVersions[0].description);
    })
  );

  ngOnDestroy(): void {
    this.#seoService.cleanupPostCEO();
  }
}
