import { Directory, File, Paths } from 'expo-file-system';

function getScansDir(): Directory {
  return new Directory(Paths.document, 'scans');
}

// Copies a just-recorded clip out of the OS-managed cache dir (which can be
// cleared under storage pressure) into the app's permanent document
// directory, and returns the new, durable file URI. Called immediately
// after recording stops, before any network call — so the audio survives
// even if the app is closed before a diagnosis succeeds.
export function cacheRecording(tempUri: string, filename: string): string {
  const dir = getScansDir();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  const dest = new File(dir, filename);
  new File(tempUri).copy(dest);
  return dest.uri;
}

export function deleteCachedRecording(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // already gone — nothing to clean up
  }
}
