import {Compiler, Inject, Injectable, Type} from '@angular/core';
import {NgModuleFactory, NgModuleRef} from '@angular/core';
import {createCustomElement} from '@angular/elements';
import {LoadChildrenCallback} from '@angular/router';
import {from, Observable, of} from 'rxjs';

import {LOAD_CALLBACKS_TOKEN, WithElement} from './registry';

@Injectable()
export class ElementsLoader {
  private cbs: Map<string, LoadChildrenCallback>;
  private ps = new Map<string, Promise<void>>();

  constructor(
    private ref: NgModuleRef<any>,
    @Inject(LOAD_CALLBACKS_TOKEN) cbs: Map<string, LoadChildrenCallback>,
    private compiler: Compiler
  ) {
    this.cbs = new Map(cbs);
  }

  loadContained(e: HTMLElement) {
    const ss = Array.from(this.cbs.keys()).filter(s => e.querySelector(s));
    if (ss.length) {
      const es = Promise.all(ss.map(s => this.load(s)));
      return from(es.then(() => undefined));
    }
    return of(undefined);
  }

  load(sel: string) {
    if (this.ps.has(sel)) {
      return this.ps.get(sel);
    }
    if (this.cbs.has(sel)) {
      const cb = this.cbs.get(sel);
      const p = (cb() as Promise<
        NgModuleFactory<WithElement> | Type<WithElement>
      >)
        .then(m => {
          if (m instanceof NgModuleFactory) {
            return m;
          } else {
            return this.compiler.compileModuleAsync(m);
          }
        })
        .then(f => {
          const r = f.create(this.ref.injector);
          const c = r.instance.customElementComponent;
          const injector = r.injector;
          customElements.define(sel, createCustomElement(c, {injector}));
          return customElements.whenDefined(sel);
        })
        .then(() => {
          this.ps.delete(sel);
          this.cbs.delete(sel);
        })
        .catch(e => {
          this.ps.delete(sel);
          return Promise.reject(e);
        });
      this.ps.set(sel, p);
      return p;
    }
    return Promise.resolve();
  }
}
