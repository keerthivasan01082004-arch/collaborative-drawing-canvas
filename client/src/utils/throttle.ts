export function throttle<T extends (...args: any[]) => void>(fn: T, limit: number): T {
  let inThrottle = false;
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  } as T;
}
