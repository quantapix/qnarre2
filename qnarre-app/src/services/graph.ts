import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {AsyncSubject, Observable, of} from 'rxjs';
import {catchError, switchMap, tap} from 'rxjs/operators';

import {LocService} from '../app/loc.serv';
import {LogService} from '../app/log.serv';

export const FILE_NOT_FOUND = 'file-not-found';
export const FETCHING_ERROR = 'fetching-error';

export const CONTENT_URL_PREFIX = 'generated/';
export const DOC_CONTENT_URL_PREFIX = CONTENT_URL_PREFIX + 'docs/';

export interface Contents {
  id: string;
  contents?: string;
}

@Injectable()
export class GraphService {
  private cache = new Map<string, Observable<Contents>>();
  doc: Observable<Contents>;

  constructor(
    private logger: LogService,
    private http: HttpClient,
    loc: LocService
  ) {
    this.doc = loc.path.pipe(switchMap(p => this.getDoc(p)));
  }

  private getDoc(url: string) {
    const id = url || 'index';
    this.logger.log('getting doc', id);
    if (!this.cache.has(id)) {
      this.cache.set(id, this.fetchDoc(id));
    }
    return this.cache.get(id);
  }

  private fetchDoc(id: string) {
    const requestPath = `${DOC_CONTENT_URL_PREFIX}${id}.json`;
    const subject = new AsyncSubject<Contents>();

    this.logger.log('fetching document from', requestPath);
    this.http
      .get<Contents>(requestPath, {responseType: 'json'})
      .pipe(
        tap(data => {
          if (!data || typeof data !== 'object') {
            this.logger.log('received invalid data:', data);
            throw Error('Invalid data');
          }
        }),
        catchError((error: HttpErrorResponse) => {
          return error.status === 404
            ? this.getNotFound(id)
            : this.getError(id, error);
        })
      )
      .subscribe(subject);
    return subject.asObservable();
  }

  private getNotFound(id: string) {
    if (id !== FILE_NOT_FOUND) {
      this.logger.error(new Error(`Doc file not found at '${id}'`));
      return this.getDoc(FILE_NOT_FOUND);
    } else {
      return of({
        id: FILE_NOT_FOUND,
        contents: 'Doc not found'
      });
    }
  }

  private getError(id: string, error: HttpErrorResponse) {
    this.logger.error(
      new Error(`Error fetching doc '${id}': (${error.message})`)
    );
    this.cache.delete(id);
    return of({
      id: FETCHING_ERROR,
      contents: FETCHING_ERROR_CONTENTS(id)
    });
  }
}

datasets: Array<{name: string; path: string}>;
selectedData = 0;
selectedFile: any;
compatibilityProvider = () => new op.TpuCompatibility();
// eslint-disable-next-line @typescript-eslint/no-empty-function
overridingHierarchyParams = () => {};
progress: {value: number; msg: string}; // notify
outGraphHierarchy: any; //  readOnly, notify
outGraph: any; // readOnly, notify
outHierarchyParams: any; // readOnly, notify



observers: [
  '_loadData(datasets, selectedData, overridingHierarchyParams, compatibilityProvider)',
  '_loadFile(selectedFile, overridingHierarchyParams, compatibilityProvider)'
];


_loadData() {
  this.debounce('load', () => {
    const dataset = this.datasets[this.selectedData];
    if (!dataset) return;
    this._parseAndConstructHierarchicalGraph(dataset.path);
  });
}

_parseAndConstructHierarchicalGraph(path?: string, pbTxtFile?: Blob) {
  const {overridingHierarchyParams, compatibilityProvider} = this;
  // Reset the progress bar to 0.
  this.progress = {value: 0, msg: ''};
  const tracker = util.getTracker(this);
  const hierarchyParams = Object.assign(
    {},
    tf.graph.hierarchy.DefaultHierarchyParams,
    overridingHierarchyParams
  );
  loader
    .loadHierGraph(
      tracker,
      path,
      pbTxtFile,
      compatibilityProvider,
      hierarchyParams
    )
    .then(({graph, graphHierarchy}) => {
      this._setOutHierarchyParams(hierarchyParams);
      this._setOutGraph(graph);
      this._setOutGraphHierarchy(graphHierarchy);
    });
}

_loadFile(e?: Event) {
  if (e) {
    const target = e.target as HTMLInputElement;
    const file = target.files[0];
    if (file) {
      target.value = '';
      this._parseAndConstructHierarchicalGraph(null, file);
    }
  }
}

const FETCHING_ERROR_CONTENTS = (path: string) => `
  <div class="nf-container l-flex-wrap flex-center">
    <div class="nf-icon material-icons">error_outline</div>
    <div class="nf-response l-flex-wrap">
      <h1 class="no-toc">Request for document failed.</h1>
      <p>
        We are unable to retrieve the "${path}" page at this time.
        Please check your connection and try again later.
      </p>
    </div>
  </div>
`;
