import {Injectable, Optional} from '@angular/core';
import {from, Observable, of} from 'rxjs';
import {first, map, share} from 'rxjs/operators';

import {LogService} from './log.serv';

type Prettify = (
  code: string,
  language?: string,
  linenums?: number | boolean
) => string;

@Injectable()
export class PrettifyService {
  private prettify: Observable<Prettify>;

  constructor(@Optional() private log?: LogService) {
    this.prettify = from(this.getPrettify()).pipe(share());
  }

  private getPrettify(): Promise<Prettify> {
    const pp = (window as any)['prettyfy'];
    return pp
      ? Promise.resolve(pp)
      : import('assets/js/prettify.js' as any).then(
          () => (window as any)['prettyfy'],
          err => {
            const msg = `Cannot get prettify.js: ${err.message}`;
            this.log?.fail(new Error(msg));
            return () => {
              throw new Error(msg);
            };
          }
        );
  }

  formatCode(code: string, language?: string, linenums?: number | boolean) {
    return this.prettify.pipe(
      map(pp => {
        try {
          return pp(code, language, linenums);
        } catch (err) {
          const msg = `Could not format code '${code.substr(0, 50)}...'.`;
          console.error(msg, err);
          throw new Error(msg);
        }
      }),
      first()
    );
  }
}

export class MockPrettify {
  formatCode(code: string, language?: string, linenums?: number | boolean) {
    const t = linenums === undefined ? '' : `, linenums: ${linenums}`;
    return of(`Formatted code (language: ${language || 'auto'}${t}): ${code}`);
  }
}
