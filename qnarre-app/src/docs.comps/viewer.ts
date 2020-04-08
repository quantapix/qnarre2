import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Optional,
  Output
} from '@angular/core';
import {Title, Meta} from '@angular/platform-browser';

import {asapScheduler, Observable, of, timer} from 'rxjs';
import {catchError, observeOn, switchMap, takeUntil, tap} from 'rxjs/operators';

import {Data, NOT_FOUND, FETCH_ERR} from './service';
import {LogService} from '../app/log.serv';
import {TocService} from '../app/toc.serv';
import {ElemService} from '../app/elem.serv';

export const NO_ANIMATIONS = 'no-animations';

const initElem = document.querySelector('qnr-docs-viewer');
const initData = initElem ? initElem.innerHTML : '';

@Component({
  selector: 'qnr-docs-viewer',
  template: ''
})
export class ViewerComp implements OnDestroy {
  static animations = true;

  private host: HTMLElement;
  private void$ = of<void>(undefined);
  private onDestroy$ = new EventEmitter<void>();
  private data$ = new EventEmitter<Data>();

  protected curr: HTMLElement = document.createElement('div');
  protected next: HTMLElement = document.createElement('div');

  @Input()
  set data(d: Data | undefined) {
    if (d) this.data$.emit(d);
  }

  @Output() ready = new EventEmitter<void>();
  @Output() removed = new EventEmitter<void>();
  @Output() inserted = new EventEmitter<void>();
  @Output() rendered = new EventEmitter<void>();

  constructor(
    ref: ElementRef,
    private title: Title,
    private meta: Meta,
    private toc: TocService,
    private elems: ElemService,
    @Optional() private log?: LogService
  ) {
    this.host = ref.nativeElement;
    this.host.innerHTML = initData;
    if (this.host.firstElementChild) {
      this.curr = this.host.firstElementChild as HTMLElement;
    }
    this.data$
      .pipe(
        observeOn(asapScheduler),
        switchMap(d => this.render(d)),
        takeUntil(this.onDestroy$)
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.onDestroy$.emit();
  }

  protected prepare(tgt: HTMLElement, k: string): () => void {
    const e = tgt.querySelector('h1');
    const needs = !!e && !/no-?toc/i.test(e?.className);
    const emb = tgt.querySelector('qnr-toc.embedded');
    if (needs && !emb) {
      e?.insertAdjacentHTML('afterend', '<qnr-toc class="embedded"></qnr-toc>');
    } else if (!needs && emb?.parentNode) emb.parentNode.removeChild(emb);
    return () => {
      this.toc.reset();
      let t = '' as string | undefined;
      if (e) {
        t =
          typeof e.innerText === 'string'
            ? e.innerText
            : e.textContent ?? undefined;
        if (needs) this.toc.toc(tgt, k);
      }
      this.title.setTitle(t ? `Qnarre - ${t}` : 'Qnarre');
    };
  }

  protected render(d: Data) {
    let addToc: () => void;
    this.noIndex(d.k === NOT_FOUND || d.k === FETCH_ERR);
    return this.void$.pipe(
      tap(() => (this.next.innerHTML = d.v || '')),
      tap(() => (addToc = this.prepare(this.next, d.k))),
      switchMap(() => this.elems.loadContained(this.next)),
      tap(() => this.ready.emit()),
      switchMap(() => this.swap(addToc)),
      tap(() => this.rendered.emit()),
      catchError(e => {
        const m = e instanceof Error ? e.stack : e;
        this.log?.fail(new Error(`[Viewer] Error rendering '${d.k}': ${m}`));
        this.next.innerHTML = '';
        this.noIndex(true);
        return this.void$;
      })
    );
  }

  private noIndex(f: boolean) {
    if (f) this.meta.addTag({name: 'robots', content: 'noindex'});
    else this.meta.removeTag('name="robots"');
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected swap(cb = () => {}) {
    const raf$ = new Observable<void>(s => {
      const f = requestAnimationFrame(() => {
        s.next();
        s.complete();
      });
      return () => cancelAnimationFrame(f);
    });
    const actual = (e: HTMLElement) => {
      const v = getComputedStyle(e).transitionDuration || '';
      return 1000 * Number(v.replace(/s$/, ''));
    };
    const animate = (
      e: HTMLElement,
      p: keyof CSSStyleDeclaration,
      from: string,
      to: string,
      dur = 200
    ) => {
      const disabled =
        !ViewerComp.animations || this.host.classList.contains(NO_ANIMATIONS);
      if (p === 'length' || p === 'parentRule') return this.void$;
      e.style.transition = '';
      return disabled
        ? this.void$.pipe(tap(() => (e.style[p] = to)))
        : this.void$.pipe(
            switchMap(() => raf$),
            tap(() => (e.style[p] = from)),
            switchMap(() => raf$),
            tap(() => (e.style.transition = `all ${dur}ms ease-in-out`)),
            switchMap(() => raf$),
            tap(() => (e.style[p] = to)),
            switchMap(() => timer(actual(e))),
            switchMap(() => this.void$)
          );
    };
    const leave = (e: HTMLElement) => animate(e, 'opacity', '1', '0.1');
    const enter = (e: HTMLElement) => animate(e, 'opacity', '0.1', '1');
    let done$ = this.void$;
    if (this.curr.parentElement) {
      done$ = done$.pipe(
        switchMap(() => leave(this.curr)),
        tap(() => this.curr.parentElement?.removeChild(this.curr)),
        tap(() => this.removed.emit())
      );
    }
    return done$.pipe(
      tap(() => this.host.appendChild(this.next)),
      tap(() => cb()),
      tap(() => this.inserted.emit()),
      switchMap(() => enter(this.next)),
      tap(() => {
        const prev = this.curr;
        this.curr = this.next;
        this.next = prev;
        this.next.innerHTML = '';
      })
    );
  }
}
