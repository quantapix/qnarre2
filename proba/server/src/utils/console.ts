export interface ConsoleInterface {
  log: (m: string) => void;
  error: (m: string) => void;
}

export class NullConsole implements ConsoleInterface {
  logs = 0;
  errs = 0;

  log(_: string) {
    this.logs++;
  }

  error(_: string) {
    this.errs++;
  }
}

export class StandardConsole implements ConsoleInterface {
  log(m: string) {
    console.log(m);
  }

  error(m: string) {
    console.error(m);
  }
}
