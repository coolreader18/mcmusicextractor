import { hasOwnProperty } from "./util";
import JSZip from "jszip";
import { ProcessAssetOptions } from "./worker";

interface Index {
  objects: {
    [filename: string]: {
      hash: string;
      size: number;
    };
  };
}

interface ProgressData {
  percentage?: number;
  text?: string;
}

interface ProcessAssetsOptions {
  files: { [filename: string]: Blob };
  minecraftVersion: string;
  onProgress: (data: ProgressData) => void;
}

export async function processAssets(
  options: ProcessAssetsOptions,
): Promise<Blob> {
  const { files, minecraftVersion, onProgress } = options;

  const indexFilename = `assets/indexes/${minecraftVersion}.json`;
  if (!hasOwnProperty(files, indexFilename)) {
    const versions = Object.keys(files)
      .map(filename => {
        const m = filename.match(/^assets\/indexes\/(.+)\.json$/);
        return m && m[1];
      })
      .filter(a => !!a)
      .join(", ");
    throw new Error(
      `Couldn't find index for version provided. The available versions are: ${versions}`,
    );
  }
  const indexFile = files[indexFilename];
  const index: Index = await new Response(indexFile).json();

  onProgress({
    text: "Processing .ogg files...",
  });

  const zip = new JSZip();

  interface ToProcess extends ProcessAssetOptions {
    basename: string;
  }
  const toProcess = Object.entries(index.objects)
    .filter(
      ([filename]) =>
        filename.startsWith("minecraft/sounds/music/") ||
        filename.startsWith("minecraft/sounds/records/"),
    )
    .map(
      ([filename, { hash }]): ToProcess => {
        const m = filename.match(/\/(([^\/]*?)\.ogg$)/);
        if (!m) {
          throw new Error(`${filename} is not a .ogg file`);
        }
        const basename = m[1];
        const songName = m[2];
        if (zip.file(basename)) {
          throw new Error(`File ${basename} occurs twice`);
        }

        const musicFilename = `assets/objects/${hash.slice(0, 2)}/${hash}`;
        if (!hasOwnProperty(files, musicFilename)) {
          throw new Error(`File ${filename} with hash ${hash} not found`);
        }

        return {
          file: files[musicFilename],
          tags: {
            TITLE: songName,
            ARTIST: "c418",
          },
          basename,
        };
      },
    );

  const amtFiles = toProcess.length;

  const maxWorkers = navigator.hardwareConcurrency || 4;

  let processingPercentage = 0;

  const workerPool = await new Promise<Worker[]>((resolve, reject) => {
    const workerPool = Array(maxWorkers)
      .fill(null)
      .map(() => {
        const worker = new Worker("./worker.ts");
        let currentBasename!: string;
        const newJob = () => {
          const options = toProcess.pop();
          if (options) {
            currentBasename = options.basename;
            worker.postMessage(options);
          } else {
            resolve(workerPool);
          }
        };
        worker.addEventListener("message", zipFile => {
          processingPercentage++;
          onProgress({
            percentage: (processingPercentage / amtFiles) * 100,
            text: `Processed ${currentBasename}`,
          });
          zip.file(currentBasename, zipFile.data);
          newJob();
        });
        worker.addEventListener("error", reject);
        newJob();
        return worker;
      });
  });

  for (const worker of workerPool) worker.terminate();

  const zipFile = await zip.generateAsync({ type: "blob" }, meta => {
    onProgress({
      percentage: meta.percent,
      // at the very end, meta.currentFile is null, so "Currently processing: null"
      // would briefly flash if not for this check.
      text: meta.currentFile && `Zipping up ${meta.currentFile}`,
    });
  });
  return zipFile;
}
