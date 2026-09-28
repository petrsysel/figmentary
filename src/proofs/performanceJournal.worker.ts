import { buildPerformanceJournal } from "./performanceJournal";

self.onmessage = (event: MessageEvent<number>) => {
  self.postMessage(buildPerformanceJournal(event.data));
};
