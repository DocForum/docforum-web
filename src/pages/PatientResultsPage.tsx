import { Link } from 'react-router-dom';
import { LabResultsList } from '../features/results/components/LabResultsList';

// Patient lab-results list page (issue #24, PRD §4 patient core flow:
// results are the end of the book → consult → order → fulfil thread).
// Standalone at /patient/results until issue #5's orders list exists to
// link from — that dependency is navigation-only, not data.
export function PatientResultsPage() {
  return (
    <div className="container">
      <p>
        <Link to="/patient">← Back to dashboard</Link>
      </p>
      <h1>Lab results</h1>
      <LabResultsList />
    </div>
  );
}
