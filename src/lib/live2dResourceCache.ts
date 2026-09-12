type ResourceType = "json" | "arraybuffer";

// Share downloads between background preparation and the Cubism loader, even
// when the HTTP cache is disabled. Keep only this page's small, fixed model set.
export function createLive2DResourceCache(fetchResource: typeof fetch = fetch) {
  const downloads = new Map<string, Promise<ArrayBuffer>>();

  return {
    async load(url: string, type: ResourceType): Promise<unknown> {
      let download = downloads.get(url);
      if (!download) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45_000);
        download = fetchResource(url, { signal: controller.signal, priority: "low" })
          .then((response) => {
            if (!response.ok) throw new Error(`Unable to load model resource: ${response.status}`);
            return response.arrayBuffer();
          })
          .finally(() => clearTimeout(timeout));
        downloads.set(url, download);
      }

      try {
        const bytes = await download;
        // Cubism adds fields to settings JSON; each consumer gets its own copy.
        return type === "json" ? JSON.parse(new TextDecoder().decode(bytes)) : bytes;
      } catch (error) {
        if (downloads.get(url) === download) downloads.delete(url);
        throw error;
      }
    },
  };
}
