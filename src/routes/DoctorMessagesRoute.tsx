import { DoctorInbox } from '../features/messaging/components/DoctorInbox';

/** `/doctor/messages` had inline JSX in the old `<Route element>`; a lazy
 * route needs a component module to load, so it lives here (issue #112). */
export function DoctorMessagesRoute() {
  return (
    <div className="container">
      <h1>Messages</h1>
      <DoctorInbox />
    </div>
  );
}
