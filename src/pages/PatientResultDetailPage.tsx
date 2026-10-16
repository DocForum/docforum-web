import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { LabResultDetail } from '../features/results/components/LabResultDetail';

// Patient lab-result detail page (issue #24): summary, abnormality flag
// with next-steps reassurance, and the lazy in-app file viewer.
export function PatientResultDetailPage() {
  const { resultId } = useParams();

  if (!resultId) {
    return (
      <div className="container">
        <p>
          <Link to="/patient/results">← Back to results</Link>
        </p>
        <p>That result couldn&apos;t be found.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <LabResultDetail resultId={resultId} />
    </div>
  );
}
