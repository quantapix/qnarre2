/*
  NOTE: This is the global export file for rxjs v6 and higher.
 */

/* rxjs */
export * from './src/index';

/* rxjs.operators */
import * as _operators from './src/operators/index';
export const operators = _operators;

/* rxjs.testing */
import * as _testing from './src/testing/index';
export const testing = _testing;

/* rxjs.ajax */
import * as _ajax from './src/ajax/index';
export const ajax = _ajax;

/* rxjs.webSocket */
import * as _webSocket from './src/webSocket/index';
export const webSocket = _webSocket;

/* rxjs.fetch */
import * as _fetch from './src/fetch/index';
export const fetch = _fetch;
