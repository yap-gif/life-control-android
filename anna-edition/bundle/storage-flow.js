/**
 * Serialize Anna Storage writes: a later snapshot is never submitted ahead
 * of an earlier in-flight write. Reject on missing acknowledgment/failure.
 * The caller must not claim saved unless the returned Promise resolves.
 */
export function queueStorageWrite(previous, storage, key, snapshot) {
  if (!storage || typeof storage.set !== "function") {
    return Promise.reject(new TypeError("Anna storage is not connected"));
  }
  return Promise.resolve(previous).catch(() => {}).then(() =>
    storage.set({ key, value: snapshot })
  );
}
