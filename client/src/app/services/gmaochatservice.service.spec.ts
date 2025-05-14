import { TestBed } from '@angular/core/testing';

import { GmaochatserviceService } from './gmaochatservice.service';

describe('GmaochatserviceService', () => {
  let service: GmaochatserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GmaochatserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
