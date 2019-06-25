/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import process from "process";
// @ts-ignore
process.platform = "browser";
// @ts-ignore
process.stderr = { write: console.error };
import "vorbis.js";
import "flac.js";
import AV from "../vendor/aurora_slim";
import { encoder as Encoder } from "vorbis-encoder-js";
import createBuffer from "audio-buffer-from";

self.addEventListener("message", event => {
  const options = event.data;
  processAsset(options)
    .then(zip => {
      self.postMessage(zip);
    })
    .catch(err => {
      setTimeout(() => {
        throw err;
      });
    });
});

export interface ProcessAssetOptions {
  file: Blob;
  tags: { [k: string]: string };
}

async function processAsset({ file, tags }: ProcessAssetOptions) {
  const asset = AV.Asset.fromFile(file);
  const buffer = await new Promise(resolve => {
    asset.decodeToBuffer(resolve);
  });

  const { format } = asset;
  const audioBuffer = createBuffer(buffer, {
    channels: format.channelsPerFrame,
    sampleRate: format.sampleRate,
    format: {
      sampleRate: format.sampleRate,
      channels: format.channelsPerFrame,
      type: format.floatingPoint ? "float32" : "array",
    },
  });

  const encoder = new Encoder(
    audioBuffer.sampleRate,
    audioBuffer.numberOfChannels,
    1,
    tags,
  );
  encoder.encodeFrom(audioBuffer);
  return encoder.finish();
}
