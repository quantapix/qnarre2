import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output
} from '@angular/core';
import {Title, Meta} from '@angular/platform-browser';

import {asapScheduler, Observable, of, timer} from 'rxjs';
import {catchError, observeOn, switchMap, takeUntil, tap} from 'rxjs/operators';

import {
  Contents,
  FILE_NOT_FOUND,
  FETCHING_ERROR
} from '../services/docs.service';
import {LoggerService} from '../services/logger.service';
import {TocService} from '../services/toc.service';
import {ElemsLoader} from '../elems/loader';

export const NO_ANIMATIONS = 'no-animations';

const initElem = document.querySelector('qnr-doc-viewer');
const initContent = initElem ? initElem.innerHTML : '';

@Component({
  selector: 'qnr-viewer',
  template: ''
})
export class ViewerComponent implements OnDestroy {
  static animationsEnabled = true;

  private host: HTMLElement;
  private void$ = of<void>(undefined);
  private onDestroy$ = new EventEmitter<void>();
  private contents$ = new EventEmitter<Contents>();

  protected curr: HTMLElement = document.createElement('div');
  protected next: HTMLElement = document.createElement('div');

  @Input()
  set doc(doc: Contents) {
    if (doc) {
      this.contents$.emit(doc);
    }
  }

  @Output() ready = new EventEmitter<void>();
  @Output() removed = new EventEmitter<void>();
  @Output() inserted = new EventEmitter<void>();
  @Output() rendered = new EventEmitter<void>();

  constructor(
    ref: ElementRef,
    private logger: Logger,
    private title: Title,
    private meta: Meta,
    private toc: TocService,
    private loader: ElemsLoader
  ) {
    this.host = ref.nativeElement;
    this.host.innerHTML = initContent;
    if (this.host.firstElementChild) {
      this.curr = this.host.firstElementChild as HTMLElement;
    }
    this.contents$
      .pipe(
        observeOn(asapScheduler),
        switchMap(newDoc => this.render(newDoc)),
        takeUntil(this.onDestroy$)
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.onDestroy$.emit();
  }

  protected prepare(target: HTMLElement, id: string): () => void {
    const te = target.querySelector('h1');
    const needs = !!te && !`/no-?toc/i`.test(te.className);
    const emb = target.querySelector('qnr-toc.embedded');
    if (needs && !emb) {
      te.insertAdjacentHTML('afterend', '<qnr-toc class="embedded"></qnr-toc>');
    } else if (!needs && emb && emb.parentNode !== null) {
      emb.parentNode.removeChild(emb);
    }
    return () => {
      this.toc.reset();
      let title: string | undefined = '';
      if (te) {
        title =
          typeof te.innerText === 'string' ? te.innerText : te.textContent;

        if (needs) {
          this.toc.genToc(target, id);
        }
      }
      this.title.setTitle(title ? `Angular - ${title}` : 'Angular');
    };
  }

  protected render(doc: Contents) {
    let addTitleAndToc: () => void;
    this.setNoIndex(doc.id === FILE_NOT_FOUND || doc.id === FETCHING_ERROR);
    return this.void$.pipe(
      tap(() => (this.next.innerHTML = doc.contents || '')),
      tap(() => (addTitleAndToc = this.prepare(this.next, doc.id))),
      switchMap(() => this.loader.loadContained(this.next)),
      tap(() => this.ready.emit()),
      switchMap(() => this.swapViews(addTitleAndToc)),
      tap(() => this.rendered.emit()),
      catchError(err => {
        const msg = err instanceof Error ? err.stack : err;
        this.logger.error(
          new Error(`[DocViewer] Error preparing document '${doc.id}': ${msg}`)
        );
        this.next.innerHTML = '';
        this.setNoIndex(true);
        return this.void$;
      })
    );
  }

  private setNoIndex(val: boolean) {
    if (val) {
      this.meta.addTag({name: 'robots', content: 'noindex'});
    } else {
      this.meta.removeTag('name="robots"');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected swapViews(onInsertedCb = () => {}) {
    const raf$ = new Observable<void>(sub => {
      const rafId = requestAnimationFrame(() => {
        sub.next();
        sub.complete();
      });
      return () => cancelAnimationFrame(rafId);
    });
    const getActualDuration = (elem: HTMLElement) => {
      const cssValue = getComputedStyle(elem).transitionDuration || '';
      const seconds = Number(cssValue.replace(/s$/, ''));
      return 1000 * seconds;
    };
    const animateProp = (
      elem: HTMLElement,
      prop: keyof CSSStyleDeclaration,
      from: string,
      to: string,
      duration = 200
    ) => {
      const animationsDisabled =
        !ViewerComponent.animationsEnabled ||
        this.host.classList.contains(NO_ANIMATIONS);
      if (prop === 'length' || prop === 'parentRule') {
        // We cannot animate length or parentRule properties because they are readonly
        return this.void$;
      }
      elem.style.transition = '';
      return animationsDisabled
        ? this.void$.pipe(tap(() => (elem.style[prop] = to)))
        : this.void$.pipe(
            switchMap(() => raf$),
            tap(() => (elem.style[prop] = from)),
            switchMap(() => raf$),
            tap(
              () => (elem.style.transition = `all ${duration}ms ease-in-out`)
            ),
            switchMap(() => raf$),
            tap(() => (elem.style[prop] = to)),
            switchMap(() => timer(getActualDuration(elem))),
            switchMap(() => this.void$)
          );
    };
    const leave = (elem: HTMLElement) =>
      animateProp(elem, 'opacity', '1', '0.1');
    const enter = (elem: HTMLElement) =>
      animateProp(elem, 'opacity', '0.1', '1');
    let done$ = this.void$;
    if (this.curr.parentElement) {
      done$ = done$.pipe(
        switchMap(() => leave(this.curr)),
        tap(() => this.curr.parentElement.removeChild(this.curr)),
        tap(() => this.removed.emit())
      );
    }
    return done$.pipe(
      tap(() => this.host.appendChild(this.next)),
      tap(() => onInsertedCb()),
      tap(() => this.inserted.emit()),
      switchMap(() => enter(this.next)),
      tap(() => {
        const prevViewContainer = this.curr;
        this.curr = this.next;
        this.next = prevViewContainer;
        this.next.innerHTML = '';
      })
    );
  }
}
