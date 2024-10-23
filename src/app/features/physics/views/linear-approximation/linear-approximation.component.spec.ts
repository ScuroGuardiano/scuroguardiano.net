import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinearApproximationComponent } from './linear-approximation.component';

describe('LinearApproximationComponent', () => {
  let component: LinearApproximationComponent;
  let fixture: ComponentFixture<LinearApproximationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinearApproximationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LinearApproximationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
