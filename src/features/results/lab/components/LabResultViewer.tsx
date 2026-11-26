import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../../components/Button';
import { ApiError, isAbortError } from '../../../../services/api-client';
import * as labResultsService from '../../../../services/lab-results-service';
import { useAuthStore } from '../../../../store/auth-store';
import type { LabResultFile } from '../../../../types/models';
import styles from './LabResults.module.css';

interface LabResultViewerProps {
  resultId: string;
  file: LabResultFile;
}

/**
 * Lazy in-app viewer (issue #24). Nothing is fetched until the patient opens
 * it, and the bytes are pulled through the authenticated API client as a
 * blob — no third-party viewer script, no token in a URL. The object URL is
 * revoked when the viewer closes or unmounts.
 */
export function LabResultViewer({ resultId, file }: LabResultViewerProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [open, setOpen] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, []);

  function close() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setObjectUrl(null);
    setOpen(false);
    setError(null);
  }

  async function openViewer() {
    setOpen(true);
    setError(null);
    if (objectUrl || !accessToken) return;

    setLoading(true);
    try {
      const blob = await labResultsService.getLabResultFile(file.contentPath, accessToken);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setObjectUrl(url);
    } catch (caught) {
      if (isAbortError(caught)) return;
      setError(
        caught instanceof ApiError && caught.status === 404
          ? 'The report file is no longer available. If you need a copy, contact the clinic.'
          : "We couldn't open the report file. Your result summary above is unchanged — please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.viewer} aria-labelledby={`viewer-${resultId}`}>
      <div className={styles.viewerActions}>
        <h2 id={`viewer-${resultId}`} className={styles.sectionTitle}>
          Full report
        </h2>
        {!open ? (
          <Button variant="secondary" onClick={openViewer}>
            View report ({file.kind === 'pdf' ? 'PDF' : 'image'})
          </Button>
        ) : (
          <div className={styles.viewerButtons}>
            {objectUrl && (
              <a className={styles.download} href={objectUrl} download={file.fileName}>
                Download {file.fileName}
              </a>
            )}
            <Button variant="secondary" onClick={close}>
              Close report
            </Button>
          </div>
        )}
      </div>

      {open && (
        <div className={styles.viewerBody}>
          {loading && <p aria-busy="true">Opening the report…</p>}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {objectUrl && file.kind === 'pdf' && (
            <iframe className={styles.pdf} title={`${file.fileName} (PDF report)`} src={objectUrl} />
          )}
          {objectUrl && file.kind === 'image' && (
            <img className={styles.image} src={objectUrl} alt={`Scanned lab report: ${file.fileName}`} />
          )}
        </div>
      )}
    </section>
  );
}
