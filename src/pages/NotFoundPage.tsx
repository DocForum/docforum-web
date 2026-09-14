import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container" style={{ textAlign: 'center' }}>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </div>
  );
}
