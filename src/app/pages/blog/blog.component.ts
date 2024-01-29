import { Component, HostBinding, OnInit, inject } from '@angular/core';
import { BlogService, SingleLangPostMetadata } from '../../services/blog.service';
import { firstValueFrom } from 'rxjs';
import { TranslocoDirective, TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { BlogPostsListComponent } from '../../components/blog-posts-list/blog-posts-list.component';

@Component({
  selector: 'app-blog',
  standalone: true,
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
  styles: [

  ],
})
export default class BlogComponent implements OnInit {
  @HostBinding("class.reading-width")
  readingWidthClas = true;

  #blogService = inject(BlogService);
  #translocoService = inject(TranslocoService);
  posts?: SingleLangPostMetadata[];

  async ngOnInit(): Promise<void> {
    // TODO: it won't react to language change, fix it uwu
    this.posts = await firstValueFrom(this.#blogService.listPostsForLanguage(
      this.#translocoService.getActiveLang(),
      'en' // Fallback language will be always en
    ));
  }
}
