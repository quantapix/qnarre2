import {Compiler, Type} from '@angular/core';
import {NgModuleFactory, NgModuleRef} from '@angular/core';
import {Inject, Injectable, InjectionToken} from '@angular/core';
import {createCustomElement} from '@angular/elements';
import {LoadChildrenCallback} from '@angular/router';
import {from, of} from 'rxjs';

export interface WithElem {
  elemComp: Type<any>;
}

export const CBS_TOKEN = new InjectionToken<Map<string, LoadChildrenCallback>>(
  'qnr/elems-map'
);

@Injectable({
  providedIn: 'root'
})
export class ElemService {
  private ps = new Map<string, Promise<void>>();
  private cbs: Map<string, LoadChildrenCallback>;

  constructor(
    private ref: NgModuleRef<any>,
    @Inject(CBS_TOKEN) cbs: Map<string, LoadChildrenCallback>,
    private compiler: Compiler
  ) {
    this.cbs = new Map(cbs);
  }

  load(sel: string) {
    if (this.ps.has(sel)) return this.ps.get(sel);
    if (this.cbs.has(sel)) {
      const cb = this.cbs.get(sel)!;
      const p = (cb() as Promise<NgModuleFactory<WithElem> | Type<WithElem>>)
        .then(m => {
          if (m instanceof NgModuleFactory) return m;
          else return this.compiler.compileModuleAsync(m);
        })
        .then(f => {
          const r = f.create(this.ref.injector);
          const c = r.instance.elemComp;
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

  loadContained(e: HTMLElement) {
    const ss = Array.from(this.cbs.keys()).filter(k => e.querySelector(k));
    if (ss.length) {
      const es = Promise.all(ss.map(s => this.load(s)));
      return from(es.then(() => undefined));
    }
    return of(undefined);
  }
}
