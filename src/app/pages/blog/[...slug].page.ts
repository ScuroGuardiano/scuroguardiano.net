import { ChangeDetectorRef, Component, HostBinding, OnInit, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <!-- <h1>{{ slug$ | async }}</h1> -->
  `,
  styles: [

  ],
})
export default class HomeComponent implements OnInit {
  @HostBinding("class.reading-width")
  readingWidthClass = true;

  #route = inject(ActivatedRoute);
  // slug$ = this.#route.subscribe(p => console.log(p));

  async ngOnInit(): Promise<void> {
    console.log(this.#route);
  }
}
