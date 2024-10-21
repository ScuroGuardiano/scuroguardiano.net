import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConvertFormComponent } from './convert-form.component';

describe('ConvertFormComponent', () => {
  let component: ConvertFormComponent;
  let fixture: ComponentFixture<ConvertFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConvertFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConvertFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
