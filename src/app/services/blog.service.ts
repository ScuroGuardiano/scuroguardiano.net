import { APP_BASE_HREF } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, of, tap } from 'rxjs';

export interface PostLanguageVersion {
  lang: string;
  title: string;
  slug: string;
  description: string;
  path: string;
}

interface PostMetadataGen<TDate> {
  key: string;
  date: TDate;
  languageVersions: PostLanguageVersion[];
}

export interface PostMetadata extends PostMetadataGen<Date> {}

export interface SingleLangPostMetadata {
  key: string;
  date: Date;
  lang: string;
  title: string;
  slug: string;
  description: string;
  path: string;
}

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  readonly #http = inject(HttpClient);
  readonly #baseHref = inject(APP_BASE_HREF, { optional: true }) ?? "";
  readonly #blogBasePath = this.#baseHref + "/assets/__sg/blog";
  readonly #postListPath = this.#blogBasePath + "/posts.json";
  readonly #blogBaseUrl = "/blog";

  #cachedPosts?: PostMetadata[];

  listPosts(): Observable<PostMetadata[]> {
    if (this.#cachedPosts) {
      return of(this.#cachedPosts);
    }

    return this.#http.get<PostMetadataGen<string>[]>(this.#postListPath)
      .pipe(
        map(res => res.map(m => ({ ...m, date: new Date(m.date) }))),
        tap(res => this.#cachedPosts = res)
      );
  }

  /**
   *
   * @param lang will return array of SingleLangPostMetadata with this language
   * @param fallbackLang if target language will not be available it will try to find this language. If not provided then ignored.
   * @returns
   */
  listPostsForLanguage(lang: string, fallbackLang?: string): Observable<SingleLangPostMetadata[]> {
    return this.listPosts().pipe(
      map(posts => {
        return posts.map(post => {
          let langVer = this.findLang(lang, post);
          if (langVer) {
            return this.toSingleLangPostMetadata(post, langVer);
          }

          if (fallbackLang && (langVer = this.findLang(fallbackLang, post))) {
            return this.toSingleLangPostMetadata(post, langVer);
          }

          return null!; // Alright, I need this ! here so typescript will shut his mouth, I AM FILTERING OUT NULLS YOU STUPID
        })
        .filter(p => p);
      })
    );
  }

  findLang(lang: string, post: PostMetadata): PostLanguageVersion | null {
    return post.languageVersions.find(p => p.lang == lang) ?? null;
  }

  toSingleLangPostMetadata(post: PostMetadata, langVer: PostLanguageVersion): SingleLangPostMetadata {
    return {
      key: post.key,
      date: post.date,
      ...langVer
    }
  }

  getUrlForPost(postPath: string) {
    return this.#blogBaseUrl + '/' + postPath.replace('.html', '');
  }

  getPostMetadata(metadataPath: string): Observable<PostMetadata> {
    return this.#http.get<PostMetadataGen<string>>(metadataPath)
      .pipe(
        map(m => ({ ...m, date: new Date(m.date) }))
      );
  }

  getPostWithContent(path: string): Observable<{ metadata: PostMetadata, content: string }> {
    const basePath = this.#blogBasePath + "/" + path;
    const contentPath = basePath + ".html";
    const metadataPath = basePath + ".json";

    return combineLatest({
      content: this.#http.get(contentPath, { responseType: "text" }),
      metadata: this.getPostMetadata(metadataPath)
    });
  }
}
