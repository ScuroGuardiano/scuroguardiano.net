import { Component } from '@angular/core';

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
export default class HomeComponent {

}
