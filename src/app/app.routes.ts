import { Route, Routes, UrlMatchResult, UrlSegment, UrlSegmentGroup } from '@angular/router';

// match urls like "/blog/:path" where path can contain '/'
function blogPostMatcher(
  segments: UrlSegment[],
  group: UrlSegmentGroup,
  route: Route
): UrlMatchResult {
  if (segments.length > 1) {
    // if first segment is 'files', then concat all the next segments into a single one
    if (segments[0].path == 'blog') {
      return {
        consumed: segments,
        posParams: {
          path: new UrlSegment(segments.slice(1).join('/'), {}),
          slug: new UrlSegment(segments.at(-1)!.toString(), {})
        },
      };
    }
  }
  return null!;
}

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    loadComponent: () => import("./pages/index.component")
  },
  {
    path: "blog",
    loadComponent: () => import("./pages/blog/blog.component")
  },
  {
    matcher: blogPostMatcher,
    loadComponent: () => import("./pages/blog/post.component")
  }
];
