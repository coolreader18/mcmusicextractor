import { saveAs } from "file-saver";
import { fromEntries } from "./util";
import { processAssets } from "./processing";

const fileInput = document.getElementById("files") as HTMLInputElement;
const versionInput = document.getElementById("version") as HTMLInputElement;
const processButton = document.getElementById("process") as HTMLButtonElement;
const progress = document.getElementById("progress") as HTMLProgressElement;
const currentFile = document.getElementById("current") as HTMLParagraphElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const resetButton = document.getElementById("reset") as HTMLButtonElement;

const mainSection = document.getElementById("main") as HTMLDivElement;
const processingSection = document.getElementById(
  "processing",
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

const worker = new Worker("./worker.ts");

worker.addEventListener("error", console.error);

processButton.addEventListener("click", () => {
  reset();
  const files = fromEntries(
    [...fileInput.files!].map(file => [
      (file as any).webkitRelativePath as string,
      file,
    ]),
  );
  processAssets({
    files,
    minecraftVersion: versionInput.value,
    onProgress: ({ percentage, text }) => {
      show(processingSection);
      if (percentage) progress.value = percentage;
      if (text) currentFile.textContent = text;
    },
  })
    .then(zip => {
      zipFile = zip;
      hide(processingSection, mainSection);
      show(doneSection);
    })
    .catch(err => {
      errorSection.textContent = err;
      currentFile.textContent = "";
      show(errorSection);
      hide(processingSection);
    });
});

let zipFile: Blob | null = null;

saveButton.addEventListener("click", () => {
  saveAs(zipFile!, "minecraft-music.zip");
});

resetButton.addEventListener("click", reset);
