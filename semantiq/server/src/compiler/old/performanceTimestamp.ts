namespace core {
  declare const performance: { now?(): number } | undefined;

  export const timestamp = typeof performance !== 'undefined' && performance.now ? () => performance.now!() : Date.now ? Date.now : () => +new Date();
}
