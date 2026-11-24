- Doctor's day: scheduled visits can now be marked **no-show** or
  **cancelled** from today's appointments list and from the queue's
  "Still expected" rows, after a confirmation dialog that names the patient.
  Both actions call docforum-core's
  `PATCH /appointments/:appointmentId/status`, refresh today's list, the live
  queue and practice insights so no-show metrics and referral cascades show
  up immediately. No-show isn't offered before the appointment's start time,
  and a linked referral's consequence (back to pending, or expired after
  repeated no-shows) is stated before confirming. A `409` — someone else
  already changed the appointment — closes the dialog, says the visit is no
  longer scheduled, and refreshes the list.
