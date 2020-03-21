import _ from "lodash";
import { diff } from "objectdiff";
import validate from "validate.js";

import { Doc, Package } from "../package";

export const processorValidationPackage = new Package("processorValidation")
  .addConfig(dgeni => {
    dgeni.stopOnValidationError = true;
  })
  .addHandler("generationStart", (log, dgeni) => {
    return () => {
      return new Promise((res: any, rej: any) => {
        const es = [];
        for (const r of dgeni.processors) {
          try {
            validate.async(r, r.$validate);
          } catch (e) {
            es.push({
              processor: r.name,
              package: r.$package,
              errors: e
            });
            log.error(
              `Invalid property in ${r.name} (in ${r.$package} package)`
            );
            log.error(e);
          }
        }
        if (es.length > 0 && dgeni.stopOnValidationError) {
          rej(es);
        }
        res();
      });
    };
  });

interface TrackDocLoggerOptions {
  docsToTrackFn(docs: Doc[]): Doc[] | undefined;
}

const topts: TrackDocLoggerOptions = {
  docsToTrackFn(docs) {
    return undefined;
  }
};

const gens = [];
let prevs: Doc[] = [];

export const trackDocLoggerPackage = new Package("trackDocLogger")
  .addFactory("trackDocLoggerOptions", () => {
    return topts;
  })
  .addHandler("processorEnd", () => {
    return (event: any, proc: { name: any }, docs: Doc[]) => {
      let ds = topts.docsToTrackFn(docs);
      if (ds) {
        if (!_.isEqual(ds, prevs)) {
          ds = _.cloneDeep(ds);
          gens.push({ processor: proc.name, docs: ds });
          prevs = ds;
        }
      }
    };
  })
  .addHandler("generationEnd", log => {
    return () => {
      log.info("trackDocLogger settings:", topts);
      log.info("trackDocLogger tracked changes:", gens);
    };
  });

let first: Doc[], start: Doc[], end: Doc[], last: Doc[];

const dopts = {
  start: undefined,
  end: undefined
};

export const docDiffLoggerPackage = new Package("docDiffLogger")
  .addFactory("docDiffLoggerOptions", () => {
    return dopts;
  })
  .addHandler("processorStart", () => {
    return (event: any, proc: { name: any }, docs: Doc[]) => {
      first = first || _.cloneDeep(docs);
      if (dopts.start === proc.name) {
        start = _.cloneDeep(docs);
      }
    };
  })
  .addHandler("processorEnd", log => {
    return (event: any, processor: { name: any }, docs: Doc[]) => {
      last = docs;
      if (dopts.end === processor.name) {
        end = _.cloneDeep(docs);
        _logDiff(log);
      }
    };
  })
  .addHandler("generationEnd", log => {
    return () => {
      if (dopts.start && !start) {
        throw new Error("docDiffLogger: missing start processor");
      }
      if (dopts.end && !end) {
        throw new Error("docDiffLogger: missing end processor");
      }
      if (!dopts.end) {
        _logDiff(log);
      }
    };
  });

function _logDiff(log: { info: (arg0: { start: any; end: any }) => void }) {
  log.info(dopts);
  log.info(diff(start || first, end || last));
}

export function mockPackage() {
  return new Package("mockPackage", [require("../")])
    .addFactory("log", () => {
      return require("dgeni/lib/mocks/log")(false);
    })
    .addFactory("templateEngine", () => {
      const s = jasmine.createSpy("templateEngine");
      return {
        getRenderer() {
          return s;
        }
      };
    });
}
