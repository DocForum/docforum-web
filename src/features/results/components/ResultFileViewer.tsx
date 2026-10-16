export type ResultFileKind = 'pdf' | 'image' | 'unknown';

/** Infer the viewer from the URL extension. docforum-core's real
 * `LabResult.resultFileUrl` carries no content-type column, so the client
 * sniffs the extension instead of requiring a new backend field. Unknown
 * extensions fall back to download-only rather than guessing. */
export function kindForResultFileUrl(fileUrl: string): ResultFileKind {
  const path = fileUrl.split('?')[0].split('#')[0].toLowerCase();
  if (path.endsWith('.pdf')) return 'pdf';
  if (
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.gif') ||
    path.endsWith('.webp') ||
    path.endsWith('.bmp') ||
    path.endsWith('.svg')
  ) {
    return 'image';
  }
  return 'unknown';
}

/**
 * In-app viewer for a lab-result file. Deliberately native-only:
 * images via `<img loading="lazy">`, PDFs via the browser's built-in
 * viewer (`<iframe>`), download via a plain anchor. No third-party
 * viewer script is loaded from a CDN at runtime (CSP-safe by
 * construction — this component adds no new script sources).
 *
 * The parent lazy-loads this component with `React.lazy` so the viewer
 * markup only mounts when a result actually has a file.
 */
export function ResultFileViewer({ fileUrl, testName }: { fileUrl: string; testName: string }) {
  const kind = kindForResultFileUrl(fileUrl);

  return (
    <div aria-label={`${testName} result file`}>
      {kind === 'image' && (
        <img
          src={fileUrl}
          alt={`${testName} result`}
          loading="lazy"
          style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)' }}
        />
      )}
      {kind === 'pdf' && (
        <>
          <iframe
            src={fileUrl}
            title={`${testName} result (PDF)`}
            loading="lazy"
            style={{ width: '100%', minHeight: '480px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
          />
          <p>
            <small>
              This PDF opens with your browser&apos;s built-in viewer — nothing extra is downloaded or loaded from
              anywhere else.
            </small>
          </p>
        </>
      )}
      {kind === 'unknown' && <p>Preview isn&apos;t available for this file type — download it to view.</p>}
      <p>
        <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
          Download result
        </a>{' '}
        ·{' '}
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          Open in a new tab
        </a>
      </p>
    </div>
  );
}
