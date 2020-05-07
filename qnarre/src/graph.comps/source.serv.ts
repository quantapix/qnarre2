import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {from} from 'rxjs';

import {Plugins} from '../app/types';

@Injectable()
export class SourceService {
  private storage = document.createElement('qnr-storage') as any;
  private backend = (document.createElement('qnr-backend') as any).backend;

  constructor(private http: HttpClient) {}

  fetchPluginsListing() {
    return this.http.get<Plugins>('data/plugins');
  }

  fetchRuns() {
    return from(this.backend.runsStore.refresh());
  }

  fetchEnvironments() {
    return from(this.backend.environmentStore.refresh());
  }
}
