/// <reference types="vite/client" />

declare module 'mux.js' {
  interface TransmuxerSegment {
    type: 'video' | 'audio' | 'combined';
    initSegment: Uint8Array;
    data: Uint8Array;
    captions: unknown[];
    metadata: unknown[];
  }

  class Transmuxer {
    on(event: 'data', callback: (segment: TransmuxerSegment) => void): void;
    on(event: 'done', callback: () => void): void;
    push(data: Uint8Array): void;
    flush(): void;
  }

  const mp4: {
    Transmuxer: typeof Transmuxer;
  };

  export { mp4, Transmuxer };
}

declare module 'mux.js/lib/mp4/transmuxer' {
  import type { Transmuxer } from 'mux.js';
  const transmuxerModule: {
    Transmuxer: typeof Transmuxer;
  };
  export default transmuxerModule;
}
