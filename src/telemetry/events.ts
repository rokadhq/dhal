import { EventEmitter } from "node:events";
import type { DhalSecurityEvent, DhalSecuritySignal } from "../types.js";

export class DhalEventBus extends EventEmitter {
  emitDecision(event: DhalSecurityEvent): void {
    this.emit("decision", event);

    if (event.decision.action === "block" || event.decision.wouldBlock) {
      this.emit("threat", event);

      if (event.threatKind) {
        this.emit(`threat:${event.threatKind}`, event);
      }
    }
  }

  emitSignal(signal: DhalSecuritySignal): void {
    this.emit("signal", signal);
    this.emit(`signal:${signal.kind}`, signal);
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
}
