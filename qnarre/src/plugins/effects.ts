import {Injectable} from '@angular/core';
import {Action, Store} from '@ngrx/store';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import {Observable, of, zip} from 'rxjs';
import {
  map,
  mergeMap,
  catchError,
  withLatestFrom,
  filter,
  tap
} from 'rxjs/operators';
import {Plugins, LoadedCode, State} from '../app/types';
import {getLoadeds} from './selectors';
import {
  loaded,
  reload,
  listingRequested,
  listingFetched,
  fetchFailed
} from './actions';
import {SourceService} from '../graph.comps/source.serv';

@Injectable()
export class Effects {
  /** @export */
  readonly loadPlugins$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loaded, reload),
      withLatestFrom(this.store.select(getLoadeds)),
      filter(([, {state}]) => state !== LoadedCode.LOADING),
      tap(() => this.store.dispatch(listingRequested())),
      mergeMap(() => {
        return zip(
          this.source.fetchPluginsListing(),
          this.source.fetchRuns(),
          this.source.fetchEnvironments()
        ).pipe(
          map(
            ([plugins]) => listingFetched({plugins}),
            catchError(() => of(fetchFailed()))
          )
        ) as Observable<Action>;
      })
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private source: SourceService
  ) {}
}
