import { TestBed } from '@angular/core/testing';

import { ServiceMaintenance } from './service-maintenance';

describe('ServiceMaintenance', () => {
  let service: ServiceMaintenance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceMaintenance);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
