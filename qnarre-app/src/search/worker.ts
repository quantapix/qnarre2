import {NgZone} from '@angular/core';
import {Observable} from 'rxjs';

export interface Message {
  type: string;
  payload: any;
  id?: number;
}

export class WorkerClient {
  private nextId = 0;

  static create(worker: Worker, zone: NgZone) {
    return new WorkerClient(worker, zone);
  }

  private constructor(private worker: Worker, private zone: NgZone) {}

  sendMessage<T>(type: string, payload?: any) {
    return new Observable<T>(sub => {
      const id = this.nextId++;
      const msg = (response: MessageEvent) => {
        const {
          type: responseType,
          id: responseId,
          payload: responsePayload
        } = response.data as Message;
        if (type === responseType && id === responseId) {
          this.zone.run(() => {
            sub.next(responsePayload);
            sub.complete();
          });
        }
      };
      const err = (e: ErrorEvent) => this.zone.run(() => sub.error(e));
      this.worker.addEventListener('message', msg);
      this.worker.addEventListener('error', err);
      this.worker.postMessage({type, id, payload});
      return () => {
        this.worker.removeEventListener('message', msg);
        this.worker.removeEventListener('error', err);
      };
    });
  }
}
