import { CancellationToken, ResponseError, ErrorCodes } from 'vscode-languageserver';

export function formatError(m: string, e: any) {
  if (e instanceof Error) return `${m}: ${e.message}\n${e.stack}`;
  if (typeof e === 'string') return `${m}: ${e}`;
  if (e) return `${m}: ${e.toString()}`;
  return m;
}

export function runSafeAsync<T, E>(
  f: () => Thenable<T>,
  v: T,
  m: string,
  token: CancellationToken
): Thenable<T | ResponseError<E>> {
  return new Promise<T | ResponseError<E>>((res) => {
    setImmediate(() => {
      if (token.isCancellationRequested) res(cancelValue());
      else {
        f().then(
          (r) => {
            if (token.isCancellationRequested) res(cancelValue());
            else res(r);
          },
          (e) => {
            console.error(formatError(m, e));
            res(v);
          }
        );
      }
    });
  });
}

export function runSafe<T, E>(
  f: () => T,
  v: T,
  m: string,
  token: CancellationToken
): Thenable<T | ResponseError<E>> {
  return new Promise<T | ResponseError<E>>((res) => {
    setImmediate(() => {
      if (token.isCancellationRequested) res(cancelValue());
      else {
        try {
          const r = f();
          if (token.isCancellationRequested) res(cancelValue());
          else res(r);
        } catch (e) {
          console.error(formatError(m, e));
          res(v);
        }
      }
    });
  });
}

function cancelValue<E>() {
  console.log('cancelled');
  return new ResponseError<E>(ErrorCodes.RequestCancelled, 'Request cancelled');
}
