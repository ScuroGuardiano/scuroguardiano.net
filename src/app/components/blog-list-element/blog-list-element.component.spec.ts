import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogListElementComponent } from './blog-list-element.component';

describe('BlogListElementComponent', () => {
  let component: BlogListElementComponent;
  let fixture: ComponentFixture<BlogListElementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogListElementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BlogListElementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
