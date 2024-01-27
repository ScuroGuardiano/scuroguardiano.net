import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDatePipe } from '@ngneat/transloco-locale';
import { BlogService, SingleLangPostMetadata } from '../../services/blog.service';

@Component({
  selector: 'app-blog-list-element',
  standalone: true,
  imports: [TranslocoDatePipe, RouterLink],
  templateUrl: './blog-list-element.component.html',
  styleUrl: './blog-list-element.component.css'
})
export class BlogListElementComponent {
  #blogService = inject(BlogService);

  post = input.required<SingleLangPostMetadata>();
  postUrl = computed(() => this.#blogService.getUrlForPost(this.post().path));
}
