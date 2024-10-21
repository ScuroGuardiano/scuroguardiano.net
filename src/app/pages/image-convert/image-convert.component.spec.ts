import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageConvertComponent } from './image-convert.component';

describe('ImageConvertComponent', () => {
  let component: ImageConvertComponent;
  let fixture: ComponentFixture<ImageConvertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageConvertComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ImageConvertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
