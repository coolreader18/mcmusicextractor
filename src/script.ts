import { fromEntries, hasOwnProperty } from "./util";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const fileInput = document.getElementById("files") as HTMLInputElement;
const versionInput = document.getElementById("version") as HTMLInputElement;
const processButton = document.getElementById("process") as HTMLButtonElement;
const progress = document.getElementById("progress") as HTMLProgressElement;
const currentFile = document.getElementById("current") as HTMLParagraphElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const resetButton = document.getElementById("reset") as HTMLButtonElement;

const mainSection = document.getElementById("main") as HTMLDivElement;
const processingSection = document.getElementById(
  "processing"
) as HTMLDivElement;
const errorSection = document.getElementById("error") as HTMLDivElement;
const doneSection = document.getElementById("done") as HTMLDivElement;

function hide(...elems: HTMLElement[]) {
  for (const elem of elems) elem.classList.add("hidden");
}
function show(...elems: HTMLElement[]) {
  for (const elem of elems) elem.classList.remove("hidden");
}

function reset() {
  show(mainSection);
  hide(doneSection, errorSection, processingSection);
}

function err(error: string) {
  errorSection.textContent = error;
  show(errorSection);
  hide(processingSection);
  return new Error(error);
}

interface Index {
  objects: {
    [filename: string]: {
      hash: string;
      size: number;
    };
  };
}

processButton.addEventListener("click", async () => {
  reset();

  const files = fromEntries(
    [...fileInput.files!].map(file => [
      (file as any).webkitRelativePath as string,
      file
    ])
  );
  const version = versionInput.value;

  const indexFilename = `assets/indexes/${version}.json`;
  if (!hasOwnProperty(files, indexFilename)) {
    console.log(files);
    const versions = Object.keys(files)
      .map(filename => {
        const m = filename.match(/^assets\/indexes\/(.+)\.json$/);
        return m && m[1];
      })
      .filter(a => !!a)
      .join(", ");
    return err(
      `Couldn't find index for version provided. The available versions are: ${versions}`
    );
  }
  const indexFile = files[indexFilename];
  const index: Index = await new Response(indexFile).json();

  const zip = new JSZip();

  const musicFiles = Object.entries(index.objects).filter(
    ([filename]) =>
      filename.startsWith("minecraft/sounds/music/") ||
      filename.startsWith("minecraft/sounds/records/")
  );
  for (const [filename, { hash }] of musicFiles) {
    const m = filename.match(/\/([^\/]*?\.ogg$)/);
    if (!m) {
      throw err(`${filename} is not a .ogg file`);
    }
    const basename = m[1];

    const musicFilename = `assets/objects/${hash.slice(0, 2)}/${hash}`;
    if (!hasOwnProperty(files, musicFilename)) {
      throw err(`File ${filename} with hash ${hash} not found`);
    }
    const file = files[musicFilename];

    if (zip.file(basename)) {
      throw err(`File ${basename} occurs twice`);
    }
    zip.file(basename, file);
  }

  show(processingSection);
  zipFile = await zip.generateAsync({ type: "blob" }, meta => {
    progress.value = meta.percent;
    // at the very end, meta.currentFile is null, so "Currently processing: null"
    // would briefly flash if not for this check.
    if (meta.currentFile) {
      currentFile.textContent = `Currently processing: ${meta.currentFile}`;
    }
  });
  hide(processingSection, mainSection);
  show(doneSection);
});

let zipFile: Blob | null = null;

saveButton.addEventListener("click", () => {
  saveAs(zipFile!, "minecraft-music.zip");
});

resetButton.addEventListener("click", reset);
