namespace qnr.performance {
  declare const onProfilerEvent: { (markName: string): void; profiler: boolean };

  const profilerEvent: (markName: string) => void = typeof onProfilerEvent === 'function' && onProfilerEvent.profiler === true ? onProfilerEvent : () => {};

  let enabled = false;
  let profilerStart = 0;
  let counts: Map<number>;
  let marks: Map<number>;
  let measures: Map<number>;

  export interface Timer {
    enter(): void;
    exit(): void;
  }

  export function createTimerIf(condition: boolean, measureName: string, startMarkName: string, endMarkName: string) {
    return condition ? createTimer(measureName, startMarkName, endMarkName) : nullTimer;
  }

  export function createTimer(measureName: string, startMarkName: string, endMarkName: string): Timer {
    let enterCount = 0;
    return {
      enter,
      exit,
    };

    function enter() {
      if (++enterCount === 1) {
        mark(startMarkName);
      }
    }

    function exit() {
      if (--enterCount === 0) {
        mark(endMarkName);
        measure(measureName, startMarkName, endMarkName);
      } else if (enterCount < 0) {
        fail('enter/exit count does not match.');
      }
    }
  }

  export const nullTimer: Timer = { enter: noop, exit: noop };

  export function mark(markName: string) {
    if (enabled) {
      marks.set(markName, timestamp());
      counts.set(markName, (counts.get(markName) || 0) + 1);
      profilerEvent(markName);
    }
  }

  export function measure(measureName: string, startMarkName?: string, endMarkName?: string) {
    if (enabled) {
      const end = (endMarkName && marks.get(endMarkName)) || timestamp();
      const start = (startMarkName && marks.get(startMarkName)) || profilerStart;
      measures.set(measureName, (measures.get(measureName) || 0) + (end - start));
    }
  }

  export function getCount(markName: string) {
    return (counts && counts.get(markName)) || 0;
  }

  export function getDuration(measureName: string) {
    return (measures && measures.get(measureName)) || 0;
  }

  export function forEachMeasure(cb: (measureName: string, duration: number) => void) {
    measures.forEach((measure, key) => {
      cb(key, measure);
    });
  }

  export function enable() {
    counts = createMap<number>();
    marks = createMap<number>();
    measures = createMap<number>();
    enabled = true;
    profilerStart = timestamp();
  }

  export function disable() {
    enabled = false;
  }
}
