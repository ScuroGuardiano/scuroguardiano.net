import { Component, HostBinding, OnDestroy, OnInit, inject } from '@angular/core';
import { BlogService, SingleLangPostMetadata } from '../../services/blog.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { TranslocoDirective, TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { BlogPostsListComponent } from '../../components/blog-posts-list/blog-posts-list.component';
import { Title } from '@angular/platform-browser';
import { SeoService } from 'src/app/services/seo.service';

@Component({
    selector: 'app-blog',
    imports: [
        TranslocoPipe,
        BlogPostsListComponent
    ],
    template: `
    <h1>{{ "blog.heading" | transloco }}</h1>
    @if (posts) {
      <app-blog-posts-list [posts]="posts"/>
    }
  `,
    styles: []
})
export default class BlogComponent implements OnInit, OnDestroy {
  @HostBinding("class.reading-width")
  readingWidthClas = true;

  #blogService = inject(BlogService);
  #translocoService = inject(TranslocoService);
  #title = inject(Title);
  #seoService = inject(SeoService);

  posts?: SingleLangPostMetadata[];
  subs: Subscription[] = [];

  async ngOnInit(): Promise<void> {
    this.subs.push(this.#translocoService.langChanges$.subscribe(() => {
      this.applyTranslations();
    }));

    this.subs.push(this.#translocoService.selectTranslate("header.blog").subscribe(t => {
      this.setTitle(t);
    }));

    this.#seoService.defaultSEO();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  async applyTranslations() {
    this.posts = await firstValueFrom(this.#blogService.listPostsForLanguage(
      this.#translocoService.getActiveLang(),
      'en' // Fallback language will be always en
    ));
  }

  setTitle(blog: string) {
    this.#title.setTitle(`${blog} · Scuro Guardiano`)
  }
}
