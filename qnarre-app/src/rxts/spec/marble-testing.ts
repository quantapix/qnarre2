import * as qs from '../source';
import * as qt from '../types';
import * as qu from '../utils';

import {ColdSource, HotSource} from '../testing';

declare const global: any;

export const emptySubs: any[] = [];

export function hot(
  marbles: string,
  values?: void,
  error?: any
): HotSource<string>;
export function hot<V>(
  marbles: string,
  values?: {[index: string]: V},
  error?: any
): HotSource<V>;
export function hot<V>(
  marbles: string,
  values?: {[index: string]: V} | void,
  error?: any
): HotSource<any> {
  if (!global.rxTestScheduler) {
    throw 'tried to use hot() in async test';
  }
  return global.rxTestScheduler.createHotSource.apply(
    global.rxTestScheduler,
    arguments
  );
}

export function cold(
  marbles: string,
  values?: void,
  error?: any
): ColdSource<string>;
export function cold<V>(
  marbles: string,
  values?: {[index: string]: V},
  error?: any
): ColdSource<V>;
export function cold(
  marbles: string,
  values?: any,
  error?: any
): ColdSource<any> {
  if (!global.rxTestScheduler) {
    throw 'tried to use cold() in async test';
  }
  return global.rxTestScheduler.createColdSource.apply(
    global.rxTestScheduler,
    arguments
  );
}

export function expectSource(
  observable: qs.Source<any>,
  unsubscriptionMarbles: string | null = null
): {toBe: observableToBeFn} {
  if (!global.rxTestScheduler) {
    throw 'tried to use expectSource() in async test';
  }
  return global.rxTestScheduler.expectSource.apply(
    global.rxTestScheduler,
    arguments
  );
}

export function expectSubscriptions(
  actualSubscriptionLogs: SubscriptionLog[]
): {toBe: subscriptionLogsToBeFn} {
  if (!global.rxTestScheduler) {
    throw 'tried to use expectSubscriptions() in async test';
  }
  return global.rxTestScheduler.expectSubscriptions.apply(
    global.rxTestScheduler,
    arguments
  );
}

export function time(marbles: string): number {
  if (!global.rxTestScheduler) {
    throw 'tried to use time() in async test';
  }
  return global.rxTestScheduler.createTime.apply(
    global.rxTestScheduler,
    arguments
  );
}
