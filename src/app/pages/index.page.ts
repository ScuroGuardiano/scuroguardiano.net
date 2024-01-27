import { Component, OnInit, inject } from '@angular/core';
import { BlogService, PostMetadata, SingleLangPostMetadata } from '../services/blog.service';
import { firstValueFrom } from 'rxjs';
import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="heading">
      <h2>Scuro Guardiano</h2>
      <p>Welcome to my unholy temple~</p>
    </div>
    <div class="content">
      <section class="projects">
        <h3>Featured projects</h3>
      </section>
      <section class="posts">
        <h3>Recent blog posts</h3>
        @if (posts) {
        <ul>
          @for (post of posts; track post.key) {
            <li>{{ post.title }}</li>
          }
        </ul>
        }
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        flex-direction: column;
      }
      .heading {
        max-width: 600px;
        text-align: center;
      }
      .heading h2 {
        font-size: 300%;
        color: var(--fg-4);
        margin-bottom: 0;
      }
      .heading p {
        color: var(--fg-3);
      }

      .content {
        width: 100%;
        display: flex;
      }
      .content > * {
        flex: 1;
      }
      .content > section > h3 {
        text-align: center;
      }
    `
  ],
})
export default class HomeComponent implements OnInit {
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
