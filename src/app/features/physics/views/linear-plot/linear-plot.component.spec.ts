import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinearPlotComponent } from './linear-plot.component';

describe('LinearPlotComponent', () => {
  let component: LinearPlotComponent;
  let fixture: ComponentFixture<LinearPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinearPlotComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LinearPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
