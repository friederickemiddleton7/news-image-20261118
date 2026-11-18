// Entry for "Sum up 18 November's world news in one image".
//
// The picture itself is committed next to this file as entry.png; the program's
// only job is to hand those exact bytes to the grader, in the directory the
// grader reads. Nothing is drawn or re-encoded here, so two runs of the same
// commit always produce byte-identical output.
import { copyFile, mkdir, open, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const IMAGE_NAME = "entry.png";
const MAX_BYTES = 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The grader sets MAKEFUN_OUTPUT_DIR; the container default is /output. */
function resolveOutputDir(): string {
  const configured = process.env.MAKEFUN_OUTPUT_DIR?.trim();
  return configured ? configured : "/output";
}

/**
 * Fail loudly, and early, if what we are about to copy is not a picture the
 * grader would accept: a missing or empty file, something that is not a PNG,
 * or a file over the 1 MiB cap.
 */
async function assertUsableImage(path: string): Promise<number> {
  let size: number;
  try {
    size = (await stat(path)).size;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`${IMAGE_NAME} is missing from the repository root (looked in ${path})`);
    }
    throw error;
  }

  if (size === 0) throw new Error(`${IMAGE_NAME} is empty`);
  if (size > MAX_BYTES) throw new Error(`${IMAGE_NAME} is ${size} bytes, over the ${MAX_BYTES}-byte cap`);

  const handle = await open(path, "r");
  try {
    const head = Buffer.alloc(PNG_SIGNATURE.length);
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    if (bytesRead < head.length || !head.equals(PNG_SIGNATURE)) {
      throw new Error(`${IMAGE_NAME} does not start with the PNG signature`);
    }
  } finally {
    await handle.close();
  }
  return size;
}

async function placeEntryImage(): Promise<{ destination: string; bytes: number }> {
  const source = join(REPO_ROOT, IMAGE_NAME);
  const destination = join(resolveOutputDir(), IMAGE_NAME);
  const bytes = await assertUsableImage(source);

  // recursive: true also succeeds when the directory already exists, which is
  // the case on the grader's second run.
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  return { destination, bytes };
}

placeEntryImage().then(
  ({ destination, bytes }) => {
    console.log(`entry image copied to ${destination} (${bytes} bytes)`);
  },
  (error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`could not copy ${IMAGE_NAME}: ${reason}`);
    process.exitCode = 1;
  },
);