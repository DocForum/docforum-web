import { AppointmentsList } from '../features/appointments/components/AppointmentsList';

export function AppointmentsPage() {
  return (
    <div className="container">
      <div className="card">
        <AppointmentsList />
      </div>
    </div>
  );
}
