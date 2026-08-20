/**
 * Singleflight Request Coalescing
 *
 * Prevents the "Cache Stampede" / "Thundering Herd" problem.
 *
 * If 1,000 concurrent requests request an uncached short URL simultaneously:
 * - Traditional architecture: 1,000 parallel database queries hammer the database.
 * - Singleflight architecture: Exactly 1 database query executes. The other 999
 *   concurrent requests attach to the ongoing Promise and resolve simultaneously.
 */

interface Call<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  sharedCount: number;
}

export class SingleflightGroup {
  private calls = new Map<string, Call<any>>();
  private totalCalls = 0;
  private coalescedCalls = 0;

  /**
   * Executes and returns the result of the given function, making sure that
   * only one execution is in-flight for a given key at a time.
   */
  public async do<T>(key: string, fn: () => Promise<T>): Promise<{ val: T; shared: boolean }> {
    this.totalCalls++;

    const existingCall = this.calls.get(key);
    if (existingCall) {
      this.coalescedCalls++;
      existingCall.sharedCount++;
      const val = await existingCall.promise;
      return { val, shared: true };
    }

    let resolveFn!: (value: T) => void;
    let rejectFn!: (reason?: any) => void;

    const promise = new Promise<T>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    const call: Call<T> = {
      promise,
      resolve: resolveFn,
      reject: rejectFn,
      sharedCount: 0,
    };

    this.calls.set(key, call);

    try {
      const result = await fn();
      call.resolve(result);
      return { val: result, shared: call.sharedCount > 0 };
    } catch (err) {
      call.reject(err);
      throw err;
    } finally {
      this.calls.delete(key);
    }
  }

  /**
   * Return telemetry metrics on how many duplicate queries were prevented
   */
  public getStats() {
    return {
      totalCalls: this.totalCalls,
      coalescedCalls: this.coalescedCalls,
      activeInFlight: this.calls.size,
      stampedeMitigationRate:
        this.totalCalls > 0
          ? ((this.coalescedCalls / this.totalCalls) * 100).toFixed(2) + "%"
          : "0%",
    };
  }
}

export const singleflight = new SingleflightGroup();
