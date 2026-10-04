/**
 * Human-readable label for an Android Storage Access Framework tree URI, e.g.
 * content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FFoodDiary → "Documents/FoodDiary".
 */
export function describeFolderUri(uri: string | null): string | null {
  if (!uri) return null;
  const match = /\/tree\/([^/]+)/.exec(uri);
  if (!match) return uri;
  let docId: string;
  try {
    docId = decodeURIComponent(match[1]);
  } catch {
    return uri;
  }
  const colon = docId.indexOf(':');
  if (colon < 0) return docId;
  const volume = docId.slice(0, colon);
  const path = docId.slice(colon + 1).replace(/\/+$/, '');
  const root = volume === 'primary' ? 'Phone storage' : 'SD card';
  return path ? (volume === 'primary' ? path : `${root}/${path}`) : root;
}
