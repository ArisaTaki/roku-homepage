import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getPreparedPreviewImage, preloadPreviewImage, subscribePreviewImage } from "./lib/previewImages";

/** Subscribe without downloading unless the caller owns preparation. */
export function usePreparedPreviewImage(
  src: string,
  { prepare = false, priority = "low" }: { prepare?: boolean; priority?: RequestPriority } = {},
): string | undefined {
  const subscribe = useCallback((listener: () => void) => subscribePreviewImage(src, listener), [src]);
  const getSnapshot = useCallback(() => getPreparedPreviewImage(src), [src]);
  const prepared = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (prepare) void preloadPreviewImage(src, priority).catch(() => {});
  }, [src, prepare, priority]);

  return prepared;
}
