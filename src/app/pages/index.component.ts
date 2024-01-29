import { Component, OnInit, inject } from '@angular/core';
import { BlogService, SingleLangPostMetadata } from '../services/blog.service';
import { firstValueFrom } from 'rxjs';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { BlogPostsListComponent } from '../components/blog-posts-list/blog-posts-list.component';
import { FeaturedProjectsComponent } from "../components/featured-projects/featured-projects.component";

@Component({
    selector: 'app-home',
    standalone: true,
    template: `
    <div class="heading">
      <h1>Scuro Guardiano</h1>
      <p>{{ "home.about" | transloco }}</p>
      <p>
        <a href="https://github.com/ScuroGuardiano" class="highlight" target="_blank">Github</a>
        {{' '}}&middot;{{' '}}
        Discord: <span class="highlight">scuroguardiano</span>
      <p>
    </div>
    <div class="content reading-width">
      <section class="projects">
        <h2>{{ "home.featuredProjects" | transloco }}</h2>
        <app-featured-projects />
      </section>
      <section class="posts">
        <h2>{{ "home.recentPosts" | transloco }}</h2>
        @if (posts) {
          <app-blog-posts-list [posts]="posts" [show]="4" />
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
        max-width: 800px;
        text-align: center;
      }
      .heading h1 {
        font-size: 250%;
        color: var(--fg-4);
      }
      .heading p {
        color: var(--fg-3);
        font-size: 1.1rem;
      }

      .heading .highlight {
        font-weight: bold;
      }

      .content {
        gap: 3rem;
        display: flex;
        flex-direction: column;
        margin-top: 2rem;
      }
      .content > * {
        flex: 1;
      }

      @media (min-width: 800px) {
        .content {
          flex-direction: row;
        }
        .content > section > h2 {
          text-align: center;
        }
        .heading h1 {
          font-size: 300%;
        }
      }
    `
    ],
    imports: [BlogPostsListComponent, TranslocoPipe, FeaturedProjectsComponent]
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
