import { Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { MessageThreadPage } from './MessageThreadPage';

function DoctorHome() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="container">
      <div className="card">
        <span className="statusPill">Phase W3 · not started</span>
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p>Today's appointments and consultations will live here — see ROADMAP.md Phase W3.</p>
      </div>
    </div>
  );
}

// Placeholder landing spot for a logged-in doctor. Real content (today's
// appointments, intake, consultation screen) is Phase W3 — see ROADMAP.md.
// The consultation message thread (#22/#23) is shared with patients.
export function DoctorDashboardPage() {
  return (
    <Routes>
      <Route index element={<DoctorHome />} />
      <Route path="messages/:threadId" element={<MessageThreadPage />} />
    </Routes>
  );
}
