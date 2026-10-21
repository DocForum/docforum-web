import { useSearchParams } from 'react-router-dom';
import { BookingForm } from '../features/booking/components/BookingForm';
import { DOCTOR_PROFILE_ID } from '../mocks/fixtures';

export function BookingPage() {
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get('doctorId') || DOCTOR_PROFILE_ID;
  const doctorName = searchParams.get('doctorName') || 'Dr. Ficticia Example';
  const specialty = searchParams.get('specialty') || 'General Practice';

  return (
    <div className="container">
      <div className="card">
        <BookingForm doctorId={doctorId} doctorName={doctorName} doctorSpecialty={specialty} />
      </div>
    </div>
  );
}
