import { TestBed } from '@angular/core/testing';

import { GmaoChatService } from './gmaochatservice.service';

describe('GmaochatserviceService', () => {
  let service: GmaoChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GmaoChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
