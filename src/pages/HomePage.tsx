import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

const DASHBOARD_BY_ROLE: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  facility: '/facility',
};

export function HomePage() {
  const user = useAuthStore((state) => state.user);

  if (user) {
    const destination = DASHBOARD_BY_ROLE[user.role];
    if (destination) return <Navigate to={destination} replace />;
  }

  return (
    <div>
      <h1>DocForum</h1>
      <p>
        Search a doctor, book a slot, get referred to the right specialist with your context
        intact, and take your prescription or lab order to a qualified facility — one continuous
        thread instead of a multi-visit, multi-queue hospital journey.
      </p>
    </div>
  );
}
