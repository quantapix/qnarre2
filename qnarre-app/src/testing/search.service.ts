import {Subject} from 'rxjs';
import {Results} from '../search/types';

export class MockSearchService {
  results = new Subject<Results>();
  initWorker = jasmine.createSpy('initWorker');
  loadIndex = jasmine.createSpy('loadIndex');
  search = jasmine.createSpy('search');
}
