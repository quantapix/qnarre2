import {Subscriber} from './Subscriber';
import {TeardownLogic} from './types';

export interface Operator<_T, R> {
  call(subscriber: Subscriber<R>, source: any): TeardownLogic;
}
