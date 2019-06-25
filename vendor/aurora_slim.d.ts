declare namespace AV {
  export class Asset {
    static fromBuffer(buffer: ArrayBuffer): Asset;
    static fromFile(file: Blob): Asset;

    metadata: any;
    format: {
      channelsPerFrame: number;
      sampleRate: number;
      floatingPoint: boolean;
    };

    start(): void;

    decodeToBuffer(cb: (buffer: Float32Array) => void): void;

    on(event: "data", cb: (buffer: Float32Array) => void): void;
    on(event: "buffer", cb: (percentage: Number) => void): void;
    on(event: "error", cb: (err: any) => void): void;
    on(event: "decodeStart", cb: () => void): void;
  }
}

export = AV;
