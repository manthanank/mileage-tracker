import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Garage } from './garage';

describe('Garage', () => {
  let component: Garage;
  let fixture: ComponentFixture<Garage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Garage],
    }).compileComponents();

    fixture = TestBed.createComponent(Garage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
