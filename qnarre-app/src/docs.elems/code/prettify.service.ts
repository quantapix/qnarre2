import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {first, map, share} from 'rxjs/operators';

import {LoggerService} from '../../services/logger.service';

type Prettify = (
  code: string,
  language?: string,
  linenums?: number | boolean
) => string;

@Injectable()
export class PrettifyService {
  private prettify: Observable<Prettify>;

  constructor(private logger: LoggerService) {
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
            this.logger.error(new Error(msg));
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
