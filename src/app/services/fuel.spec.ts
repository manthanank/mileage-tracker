import { TestBed } from '@angular/core/testing';

import { Fuel } from './fuel';

describe('Fuel', () => {
  let service: Fuel;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Fuel);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
