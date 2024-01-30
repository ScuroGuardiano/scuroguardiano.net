import { APP_BASE_HREF, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, Optional, PLATFORM_ID, Renderer2, RendererFactory2, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { TranslocoService } from '@ngneat/transloco';
import { BlogService, PostLanguageVersion, PostMetadata } from './blog.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  #document = inject(DOCUMENT);
  #meta = inject(Meta);
  #rendererFactory = inject(RendererFactory2);
  #renderer = this.#rendererFactory.createRenderer(null, null);
  #baseHref: string;
  #transoloco = inject(TranslocoService);
  #blogService = inject(BlogService);

  constructor(@Optional() @Inject(APP_BASE_HREF) baseHref: string | undefined, @Inject(PLATFORM_ID) platformId: string) {
    if (!baseHref) {
      baseHref = isPlatformBrowser(platformId) ? location.origin : "";
    }
    this.#baseHref = baseHref;
  }

  async defaultSEO() {
    const description = await firstValueFrom(this.#transoloco.selectTranslate("seo.description"));
    this.setDescription(description);
  }


  /**
   * Sets post description and alternate hreflang links
   * @param post
   * @param description
   */
  postSEO(post: PostMetadata, description: string) {
    this.setDescription(description);
    // just to make sure we have no other alternate links
    this.cleanupPostCEO();
    if (post.languageVersions.length <= 1) {
      // If we have only one language version we will setting alternate links
      return;
    }

    post.languageVersions.forEach(lv => {
      const link = this.#renderer.createElement("link") as HTMLLinkElement;
      link.rel = "alternate";
      link.hreflang = lv.lang;
      link.href = this.#baseHref + this.#blogService.getUrlForPost(lv.path);
      this.#renderer.appendChild(this.#document.head, link);
    });
  }

  /**
   * Cleanup method to remove post specific hreflang links
   */
  cleanupPostCEO() {
    const alternates = this.#document.head.querySelectorAll("link[rel=alternate]");
    alternates.forEach(link => this.#renderer.removeChild(this.#document.head, link));
  }

  private setDescription(description: string) {
    if (this.#meta.getTag('name="description"')) {
      this.#meta.updateTag({
        name: "description",
        content: description
      }, 'name="description"');

      return;
    }

    this.#meta.addTag({ name: "description", content: description });
  }
}
