namespace qnr {
  declare const performance: { now?(): number } | undefined;
  /** Gets a timestamp with (at least) ms resolution */
  export const timestamp = typeof performance !== 'undefined' && performance.now ? () => performance.now!() : Date.now ? Date.now : () => +new Date();
}