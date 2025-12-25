interface RateLimitState {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitState>;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 90, windowMs: number = 60000) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(identifier: string = 'default'): Promise<void> {
    const now = Date.now();
    const state = this.requests.get(identifier);

    if (!state || now > state.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return;
    }

    if (state.count >= this.maxRequests) {
      const waitTime = state.resetTime - now;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.requests.set(identifier, {
          count: 1,
          resetTime: Date.now() + this.windowMs,
        });
        return;
      }
    }

    state.count += 1;
  }

  getRemainingRequests(identifier: string = 'default'): number {
    const state = this.requests.get(identifier);
    if (!state || Date.now() > state.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - state.count);
  }

  reset(identifier: string = 'default'): void {
    this.requests.delete(identifier);
  }
}

