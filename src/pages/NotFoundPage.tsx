import { Link } from 'react-router-dom';
import { useT } from '../i18n/useT';

export function NotFoundPage() {
  const t = useT();

  return (
    <div className="container" style={{ textAlign: 'center' }}>
      <h1>{t('notFound.title', 'Page not found')}</h1>
      <p>
        <Link to="/">{t('notFound.backHome', 'Back to home')}</Link>
      </p>
    </div>
  );
}
