declare module "vorbis-encoder-js" {
  class Encoder {
    constructor(
      sampleRate: number,
      numberOfChannels: number,
      quality: number,
      tags: { [k: string]: string }
    );
    encodeFrom(buffer: import("audio-buffer")): void;
    finish(mime?: string): Blob;
  }

  export const encoder: typeof Encoder;
}

declare module "audio-buffer" {
  class AudioBuffer {
    numberOfChannels: number;
    sampleRate: number;
  }
  export = AudioBuffer;
}

declare module "audio-buffer-from" {
  function createBuffer(...args: any[]): import("audio-buffer");
  export = createBuffer;
}
