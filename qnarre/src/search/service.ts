import {NgZone, Injectable} from '@angular/core';
import {
  ConnectableObservable,
  Observable,
  race,
  ReplaySubject,
  timer
} from 'rxjs';
import {concatMap, first, publishReplay} from 'rxjs/operators';
import {WorkerClient} from './worker';
import {Results} from './types';

@Injectable()
export class SearchService {
  private ready: Observable<boolean>;
  private worker: WorkerClient;
  private subject = new ReplaySubject<string>(1);

  constructor(private zone: NgZone) {}

  initWorker(delay: number) {
    const ready = (this.ready = race<any>(
      timer(delay),
      this.subject.asObservable().pipe(first())
    ).pipe(
      concatMap(() => {
        const w = new Worker('./search.worker', {type: 'module'});
        this.worker = WorkerClient.create(w, this.zone);
        return this.worker.sendMessage<boolean>('load-index');
      }),
      publishReplay(1)
    ));
    (ready as ConnectableObservable<boolean>).connect();
    return ready;
  }

  search(query: string) {
    this.subject.next(query);
    return this.ready.pipe(
      concatMap(() => this.worker.sendMessage<Results>('query-index', query))
    );
  }
}
