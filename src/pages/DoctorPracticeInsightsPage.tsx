import { Link } from 'react-router-dom';
import { PracticeInsightsView } from '../features/insights/components/PracticeInsightsView';
import { useT } from '../i18n/useT';

export function DoctorPracticeInsightsPage() {
  const t = useT();

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-12)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link to="/doctor" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)', textDecoration: 'none' }}>
          {t('insights.backToDashboard', '← Back to Doctor Dashboard')}
        </Link>
      </div>
      <PracticeInsightsView />
    </div>
  );
}
