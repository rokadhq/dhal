import { EventEmitter } from "node:events";
import type { DhalSecurityEvent, DhalSecuritySignal } from "../types.js";

export type DhalEventListenerError = {
  eventName: string;
  error: unknown;
};

export class DhalEventBus extends EventEmitter {
  constructor(private readonly onListenerError?: (failure: DhalEventListenerError) => void) {
    super();
  }

  emitDecision(event: DhalSecurityEvent): void {
    this.emitSafely("decision", event);

    if (event.decision.action === "block" || event.decision.wouldBlock) {
      this.emitSafely("threat", event);

      if (event.threatKind) {
        this.emitSafely(`threat:${event.threatKind}`, event);
      }
    }
  }

  emitSignal(signal: DhalSecuritySignal): void {
    this.emitSafely("signal", signal);
    this.emitSafely(`signal:${signal.kind}`, signal);
  }

  onDecision(listener: (event: DhalSecurityEvent) => void): this {
    return this.on("decision", listener);
  }

  onThreat(listener: (event: DhalSecurityEvent) => void): this {
    return this.on("threat", listener);
  }

  onSignal(listener: (signal: DhalSecuritySignal) => void): this {
    return this.on("signal", listener);
  }

  private emitSafely(eventName: string, payload: unknown): void {
    for (const listener of this.rawListeners(eventName)) {
      try {
        Reflect.apply(listener, this, [payload]);
      } catch (error) {
        try {
          this.onListenerError?.({ eventName, error });
        } catch {
          // Event error reporting must never affect request handling.
        }
      }
    }
  }
}
