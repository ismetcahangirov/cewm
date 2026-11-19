type Size = { width: number; height: number };

type InitMessage = {
  type: "init";
  frames: string[];
  decode: Size;
  ladder: Size;
  ladderStep: number;
  ahead: number;
  behind: number;
};

type InMessage =
  | InitMessage
  | { type: "seek"; index: number; direction: number }
  | { type: "resize"; decode: Size; ladder: Size; generation: number }
  | { type: "visibility"; hidden: boolean };

type Scope = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<InMessage>) => void) | null;
};

const scope = globalThis as unknown as Scope;

const passes = [8, 4, 2, 1];
const maxFetches = 6;
const maxDecodes = 2;

let config: InitMessage | null = null;
let blobs: (Blob | null)[] = [];
const fetching = new Set<number>();
const decoding = new Set<string>();
const sentWindow = new Set<number>();
const sentLadder = new Set<number>();
let center = 0;
let direction = 1;
let generation = 0;
let paused = false;
let bytes = 0;
let loaded = 0;
let failed = false;
let decodedAny = false;
let failures = 0;

function inWindow(index: number) {
  if (!config) return false;
  const ahead = direction >= 0 ? config.ahead : config.behind;
  const behind = direction >= 0 ? config.behind : config.ahead;
  return index >= center - behind && index <= center + ahead;
}

function nextToFetch(): number | null {
  if (!config) return null;
  const count = config.frames.length;
  for (const step of passes) {
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < count; index += step) {
      if (blobs[index] || fetching.has(index)) continue;
      const distance = Math.abs(index - center) * (inWindow(index) ? 0.25 : 1);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    if (best !== null) return best;
  }
  return null;
}

function pump() {
  if (!config || paused || failed) return;
  while (fetching.size < maxFetches) {
    const index = nextToFetch();
    if (index === null) break;
    fetching.add(index);
    void fetch(config.frames[index] ?? "", { priority: "low" } as RequestInit)
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        fetching.delete(index);
        if (!blob) return;
        blobs[index] = blob;
        bytes += blob.size;
        loaded += 1;
        scope.postMessage({ type: "progress", loaded, bytes });
        schedule();
      })
      .catch(() => {
        fetching.delete(index);
      })
      .finally(pump);
  }
  schedule();
}

function wanted(): { index: number; ladder: boolean } | null {
  if (!config) return null;
  let best: { index: number; ladder: boolean } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const count = config.frames.length;
  const ahead = direction >= 0 ? config.ahead : config.behind;
  const behind = direction >= 0 ? config.behind : config.ahead;
  for (
    let index = Math.max(0, center - behind);
    index <= Math.min(count - 1, center + ahead);
    index += 1
  ) {
    if (!blobs[index] || sentWindow.has(index) || decoding.has(`w${index}`)) continue;
    const distance = Math.abs(index - center) + (index < center === direction >= 0 ? 0.5 : 0);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { index, ladder: false };
    }
  }
  if (best) return best;
  for (let index = 0; index < count; index += config.ladderStep) {
    if (!blobs[index] || sentLadder.has(index) || decoding.has(`l${index}`)) continue;
    const distance = Math.abs(index - center);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { index, ladder: true };
    }
  }
  return best;
}

function schedule() {
  if (!config || paused || failed) return;
  while (decoding.size < maxDecodes) {
    const job = wanted();
    if (!job) return;
    const key = `${job.ladder ? "l" : "w"}${job.index}`;
    const size = job.ladder ? config.ladder : config.decode;
    const blob = blobs[job.index];
    if (!blob) return;
    decoding.add(key);
    const started = performance.now();
    const jobGeneration = generation;
    (job.ladder ? sentLadder : sentWindow).add(job.index);
    void createImageBitmap(blob, {
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: "high",
    })
      .then((bitmap) => {
        decoding.delete(key);
        decodedAny = true;
        if (jobGeneration !== generation) {
          bitmap.close();
          return;
        }
        scope.postMessage(
          {
            type: "frame",
            index: job.index,
            ladder: job.ladder,
            generation: jobGeneration,
            decodeMs: performance.now() - started,
            bitmap,
          },
          [bitmap],
        );
      })
      .catch(() => {
        decoding.delete(key);
        (job.ladder ? sentLadder : sentWindow).delete(job.index);
        failures += 1;
        if (!decodedAny && failures >= 2) {
          failed = true;
          scope.postMessage({ type: "unsupported" });
        }
      })
      .finally(schedule);
  }
}

scope.onmessage = (event) => {
  const message = event.data;
  switch (message.type) {
    case "init":
      config = message;
      blobs = message.frames.map(() => null);
      pump();
      break;
    case "seek":
      center = message.index;
      direction = message.direction;
      for (const index of [...sentWindow]) if (!inWindow(index)) sentWindow.delete(index);
      pump();
      break;
    case "resize":
      if (!config) return;
      config = { ...config, decode: message.decode, ladder: message.ladder };
      generation = message.generation;
      sentWindow.clear();
      sentLadder.clear();
      schedule();
      break;
    case "visibility":
      paused = message.hidden;
      if (!paused) pump();
      break;
  }
};
