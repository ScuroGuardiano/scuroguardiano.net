import { Component, computed, input } from '@angular/core';
import { SingleLangPostMetadata } from 'src/app/services/blog.service';
import { BlogListElementComponent } from "../blog-list-element/blog-list-element.component";

@Component({
    selector: 'app-blog-posts-list',
    templateUrl: './blog-posts-list.component.html',
    styleUrl: './blog-posts-list.component.css',
    imports: [BlogListElementComponent]
})
export class BlogPostsListComponent {
  posts = input.required<SingleLangPostMetadata[]>();
  show = input<number | undefined>(undefined);
  slicedPosts = computed(() => this.posts().slice(0, this.show()));
}
