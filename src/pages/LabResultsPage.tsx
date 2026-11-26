import { Link } from 'react-router-dom';
import { LabResultList } from '../features/results/lab/components/LabResultList';
import { useMyLabResults } from '../features/results/lab/hooks/useLabResults';
import styles from '../features/results/lab/components/LabResults.module.css';

/** Patient lab results list (issue #24). Each row opens the detail view with
 * the summary, values and in-app report viewer. */
export function LabResultsPage() {
  const results = useMyLabResults();

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <Link to="/patient">← Your care summary</Link>
        <h1 className={styles.title}>Lab results</h1>
        <p className={styles.muted}>
          Results appear here once the lab releases them. A flagged value always comes with what happens next.
        </p>
      </div>

      <LabResultList
        results={results.data ?? []}
        isPending={results.isPending}
        isError={results.isError}
        onRetry={() => results.refetch()}
      />
    </div>
  );
}
