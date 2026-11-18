/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: packages/api-client/openapi/docforum-core.openapi.yaml
 * API version: 0.1.0
 * Regenerate: npm run generate:api
 */

export interface components {
  schemas: {
  "ErrorEnvelope": {
    "message": string;
    "code"?: string;
    "details"?: { [key: string]: unknown };
    "requestId"?: string;
  };

  "Role": "patient" | "doctor" | "facility" | "admin";

  "SelfServeRole": "patient" | "doctor";

  "VerificationStatus": "pending" | "verified" | "rejected";

  "User": {
    "id": string;
    "email": string;
    "role": components["schemas"]["Role"];
    "createdAt": string;
    "updatedAt": string;
  };

  "AuthSession": {
    "user": components["schemas"]["User"];
    "accessToken": string;
  };

  "SignupInput": {
    "role": components["schemas"]["SelfServeRole"];
    "email": string;
    "password": string;
    "fullName": string;
  };

  "LoginInput": {
    "email": string;
    "password": string;
  };

  "ClaimAccountInput": {
    "token": string;
    "email": string;
    "password": string;
  };

  "PatientProfile": {
    "id": string;
    "userId": string;
    "fullName": string;
    "dateOfBirth"?: string;
  };

  "DoctorProfile": {
    "id": string;
    "userId": string;
    "fullName": string;
    "verificationStatus": components["schemas"]["VerificationStatus"];
  };

  "FacilityType": "lab" | "pharmacy";

  "FacilityProfile": {
    "id": string;
    "userId": string;
    "name": string;
    "type": components["schemas"]["FacilityType"];
  };

  "FacilityLocation": {
    "address": string;
    "city": string;
    "latitude": number;
    "longitude": number;
  };

  "FacilityWithDistance": components["schemas"]["FacilityProfile"] & {
    "location"?: components["schemas"]["FacilityLocation"];
    "distanceKm"?: (number) | null;
    "isOpen"?: boolean;
    "phone"?: string;
    "rating"?: number;
  };

  "Relationship": "parent" | "guardian" | "carer";

  "HandoverStatus": "not_eligible" | "eligible" | "invited" | "claimed";

  "Dependent": {
    "id": string;
    "guardianProfileId": string;
    "fullName": string;
    "dateOfBirth": string;
    "relationship": components["schemas"]["Relationship"];
    "handoverStatus": components["schemas"]["HandoverStatus"];
    "claimEmail"?: string;
    "claimInviteExpiresAt"?: string;
    "createdAt": string;
    "updatedAt": string;
  };

  "DependentInput": {
    "fullName": string;
    "dateOfBirth": string;
    "relationship": components["schemas"]["Relationship"];
  };

  "HandoverInviteInput": {
    "email": string;
  };

  "HealthSectionKey": "allergies" | "conditions" | "medications";

  "HealthEntry": {
    "id": string;
    "patientProfileId": string;
    "section": components["schemas"]["HealthSectionKey"];
    "name": string;
    "details"?: string;
    "version": number;
    "previousValue"?: string;
    "updatedAt": string;
    "createdAt": string;
  };

  "HealthEntryInput": {
    "section": components["schemas"]["HealthSectionKey"];
    "name": string;
    "details"?: string;
  };

  "HealthEntryUpdate": {
    "name": string;
    "details"?: string;
  };

  "DataExportStatus": "pending" | "processing" | "ready" | "expired" | "failed";

  "DataExport": {
    "id": string;
    "patientProfileId": string;
    "status": components["schemas"]["DataExportStatus"];
    "requestedAt": string;
    "readyAt"?: (string) | null;
    "expiresAt"?: (string) | null;
    "fileSizeBytes"?: (number) | null;
    "downloadUrl"?: (string) | null;
    "errorMessage"?: (string) | null;
  };

  "RequestDataExportInput": {
    "password": string;
  };

  "DeleteAccountInput": {
    "password": string;
    "confirmation": string;
  };

  "DeleteAccountResponse": {
    "success": boolean;
    "message": string;
    "deletedAt": string;
  };

  "CareStepType": "appointment" | "consultation" | "referral" | "order" | "fulfillment" | "payment";

  "CareStepStatus": "completed" | "in_progress" | "action_required" | "pending" | "skipped";

  "CareThreadStep": {
    "id": string;
    "stepType": components["schemas"]["CareStepType"];
    "title": string;
    "description": string;
    "status": components["schemas"]["CareStepStatus"];
    "timestamp"?: (string) | null;
    "actionLabel"?: (string) | null;
    "actionUrl"?: (string) | null;
    "metadata"?: { [key: string]: unknown };
  };

  "CareThread": {
    "id": string;
    "patientProfileId": string;
    "title": string;
    "doctorName": string;
    "specialty": string;
    "startedAt": string;
    "updatedAt": string;
    "status": "active" | "completed" | "cancelled";
    "steps": Array<components["schemas"]["CareThreadStep"]>;
  };

  "AppointmentStatus": "scheduled" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";

  "Appointment": {
    "id": string;
    "doctorProfileId": string;
    "patientProfileId": string;
    "patientName": string;
    "startsAt": string;
    "endsAt": string;
    "status": components["schemas"]["AppointmentStatus"];
    "reason"?: (string) | null;
    "checkInAt"?: (string) | null;
    "startedAt"?: (string) | null;
    "completedAt"?: (string) | null;
  };

  "QueueEntry": {
    "appointmentId": string;
    "patientProfileId": string;
    "fullName": string;
    "checkedInAt": string;
    "queuePosition": number;
    "status": "checked_in" | "in_progress" | "completed";
  };

  "RunningDelay": {
    "computedDelayMin": number;
    "manualOverrideMin": (number) | null;
    "effectiveDelayMin": number;
  };

  "UpdateRunningDelayInput": {
    "manualOverrideMin": (number) | null;
  };

  "MessageThread": {
    "id": string;
    "patientProfileId": string;
    "patientName": string;
    "lastMessageAt": string;
    "unreadCount": number;
    "lastPreview"?: (string) | null;
    "waitingMinutes"?: (number) | null;
    "closingSoon"?: boolean;
  };

  "ListThreadsResult": {
    "threads": Array<components["schemas"]["MessageThread"]>;
    "nextCursor": (string) | null;
  };

  "ConsultationAddendum": {
    "id": string;
    "noteId": string;
    "content": string;
    "createdAt": string;
  };

  "ConsultationNote": {
    "id": string;
    "appointmentId": string;
    "content": string;
    "signedAt"?: (string) | null;
    "signedBy"?: (string) | null;
    "autoSignOffAt"?: (string) | null;
    "addenda": Array<components["schemas"]["ConsultationAddendum"]>;
  };

  "AddAddendumInput": {
    "content": string;
  };

  "DateRangePreset": "7d" | "30d" | "90d" | "custom";

  "DateRange": {
    "preset": components["schemas"]["DateRangePreset"];
    "startDate": string;
    "endDate": string;
  };

  "UtilisationWeek": {
    "weekLabel": string;
    "startDate": string;
    "endDate": string;
    "offeredSlots": number;
    "bookedSlots": number;
    "completedSlots": number;
    "utilisationRate": number;
  };

  "NoShowMetrics": {
    "totalScheduled": number;
    "completedVisits": number;
    "noShows": number;
    "lateCancellations": number;
    "onTimeCancellations": number;
    "noShowRate": number;
    "lateCancelRate": number;
    "sampleSizeWarning": boolean;
  };

  "ReferralTurnaroundMetrics": {
    "totalSent": number;
    "totalAccepted": number;
    "totalPending": number;
    "averageAcceptanceHours": number;
    "medianAcceptanceHours": number;
    "breakdownUnder24h": number;
    "breakdown24to48h": number;
    "breakdownOver48h": number;
    "sampleSizeWarning": boolean;
  };

  "MessageResponseMetrics": {
    "totalThreads": number;
    "averageFirstResponseMinutes": number;
    "medianFirstResponseMinutes": number;
    "respondedWithin2hCount": number;
    "respondedWithin24hCount": number;
    "rateWithin2h": number;
    "sampleSizeWarning": boolean;
  };

  "DoctorPracticeInsights": {
    "doctorProfileId": string;
    "range": components["schemas"]["DateRange"];
    "generatedAt": string;
    "utilisation": {
      "weeks": Array<components["schemas"]["UtilisationWeek"]>;
      "overallOfferedSlots": number;
      "overallBookedSlots": number;
      "overallUtilisationRate": number;
      "sampleSizeWarning": boolean;
    };
    "noShows": components["schemas"]["NoShowMetrics"];
    "referrals": components["schemas"]["ReferralTurnaroundMetrics"];
    "messages": components["schemas"]["MessageResponseMetrics"];
  };

  "FacilityMemberRole": "owner" | "staff";

  "FacilityMember": {
    "id": string;
    "facilityId": string;
    "userId": string;
    "fullName": string;
    "email": string;
    "role": components["schemas"]["FacilityMemberRole"];
    "joinedAt": string;
    "isCurrentUser"?: boolean;
  };

  "InviteStatus": "pending" | "accepted" | "revoked" | "expired";

  "FacilityInvite": {
    "id": string;
    "facilityId": string;
    "email": string;
    "role": components["schemas"]["FacilityMemberRole"];
    "invitedBy": string;
    "invitedAt": string;
    "expiresAt": string;
    "status": components["schemas"]["InviteStatus"];
  };

  "InviteMemberInput": {
    "email": string;
    "role": components["schemas"]["FacilityMemberRole"];
  };

  "RemoveMemberResponse": {
    "success": boolean;
    "memberId": string;
    "sessionsRevoked": boolean;
    "message": string;
  };

  "FulfillmentOrderType": "prescription" | "lab";

  "FulfillmentItemStatus": "pending" | "in_progress" | "fulfilled" | "rejected";

  "FulfillmentActionAttribution": {
    "action": "dispensed" | "sample_collected" | "verified" | "rejected";
    "performedByUserId": string;
    "performedByName": string;
    "performedByEmail": string;
    "performedByRole": components["schemas"]["FacilityMemberRole"];
    "timestamp": string;
    "notes"?: (string) | null;
  };

  "FulfillmentQueueItem": {
    "id": string;
    "facilityId": string;
    "orderId": string;
    "orderType": components["schemas"]["FulfillmentOrderType"];
    "patientName": string;
    "patientProfileId": string;
    "itemName": string;
    "instructions"?: (string) | null;
    "status": components["schemas"]["FulfillmentItemStatus"];
    "receivedAt": string;
    "attribution"?: (components["schemas"]["FulfillmentActionAttribution"]) | null;
  };

  "FulfillmentActionInput": {
    "action": "fulfilled" | "rejected";
    "notes"?: string;
  };

  "WalletLink": {
    "id": string;
    "facilityId": string;
    "stellarPublicKey": string;
    "createdAt": string;
    "updatedAt": string;
  };

  "LinkWalletInput": {
    "stellarPublicKey": string;
  };

  "OrderTypeForPayment": "prescription" | "lab_order";

  "PaymentIntentStatus": "created" | "escrowed" | "released" | "refunded" | "failed";

  "PaymentIntent": {
    "id": string;
    "orderType": components["schemas"]["OrderTypeForPayment"];
    "orderId": string;
    "status": components["schemas"]["PaymentIntentStatus"];
    "patientProfileId": string;
    "facilityId": string;
    "amountStroops": string;
    "escrowId"?: (string) | null;
    "stellarTxHash"?: (string) | null;
    "sorobanContractId"?: (string) | null;
    "createdAt": string;
    "updatedAt": string;
  };

  "CreatePaymentIntentInput": {
    "orderType": components["schemas"]["OrderTypeForPayment"];
    "orderId": string;
    "patientProfileId": string;
    "facilityId": string;
    "amountStroops": string;
  };
  };
}

/** Only the operations this client exposes; responses carry success statuses. */
export interface paths {
  "/auth/signup": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["SignupInput"] } };
      responses: {
          201: { content: { "application/json": components["schemas"]["AuthSession"] } };
      };
    };
  };

  "/auth/login": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["LoginInput"] } };
      responses: {
          200: { content: { "application/json": components["schemas"]["AuthSession"] } };
      };
    };
  };

  "/auth/logout": {
    post: {
      responses: {

      };
    };
  };

  "/auth/claim-account": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["ClaimAccountInput"] } };
      responses: {

      };
    };
  };

  "/account/data-export": {
    get: {
      responses: {
          200: { content: { "application/json": (components["schemas"]["DataExport"]) | null } };
      };
    };
    post: {
      requestBody: { content: { "application/json": components["schemas"]["RequestDataExportInput"] } };
      responses: {
          202: { content: { "application/json": components["schemas"]["DataExport"] } };
      };
    };
  };

  "/account/data-export/{exportId}/download": {
    get: {
      responses: {
          200: { content: { "application/json": string } };
      };
    };
  };

  "/account/delete": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["DeleteAccountInput"] } };
      responses: {
          200: { content: { "application/json": components["schemas"]["DeleteAccountResponse"] } };
      };
    };
  };

  "/patients/me/dependents": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["Dependent"]> } };
      };
    };
    post: {
      requestBody: { content: { "application/json": components["schemas"]["DependentInput"] } };
      responses: {
          201: { content: { "application/json": components["schemas"]["Dependent"] } };
      };
    };
  };

  "/patients/me/dependents/{dependentId}": {
    patch: {
      requestBody: { content: { "application/json": components["schemas"]["DependentInput"] } };
      responses: {
          200: { content: { "application/json": components["schemas"]["Dependent"] } };
      };
    };
  };

  "/patients/me/dependents/{dependentId}/handover-invite": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["HandoverInviteInput"] } };
      responses: {
          200: { content: { "application/json": components["schemas"]["Dependent"] } };
      };
    };
  };

  "/patients/me/dependents/{dependentId}/handover-invite/resend": {
    post: {
      responses: {
          200: { content: { "application/json": components["schemas"]["Dependent"] } };
      };
    };
  };

  "/patients/{patientProfileId}/health/{section}": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["HealthEntry"]> } };
      };
    };
  };

  "/patients/{patientProfileId}/health": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["HealthEntryInput"] } };
      responses: {
          201: { content: { "application/json": components["schemas"]["HealthEntry"] } };
      };
    };
  };

  "/patients/{patientProfileId}/health/{entryId}": {
    patch: {
      requestBody: { content: { "application/json": components["schemas"]["HealthEntryUpdate"] } };
      responses: {
          200: { content: { "application/json": components["schemas"]["HealthEntry"] } };
      };
    };
    delete: {
      responses: {

      };
    };
  };

  "/patients/{patientProfileId}/care-threads": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["CareThread"]> } };
      };
    };
  };

  "/care-threads/{threadId}": {
    get: {
      responses: {
          200: { content: { "application/json": components["schemas"]["CareThread"] } };
      };
    };
  };

  "/facilities": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["FacilityWithDistance"]> } };
      };
    };
  };

  "/facilities/{facilityId}/members": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["FacilityMember"]> } };
      };
    };
  };

  "/facilities/{facilityId}/members/{memberId}": {
    delete: {
      responses: {
          200: { content: { "application/json": components["schemas"]["RemoveMemberResponse"] } };
      };
    };
  };

  "/facilities/{facilityId}/invites": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["FacilityInvite"]> } };
      };
    };
    post: {
      requestBody: { content: { "application/json": components["schemas"]["InviteMemberInput"] } };
      responses: {
          201: { content: { "application/json": components["schemas"]["FacilityInvite"] } };
      };
    };
  };

  "/facilities/{facilityId}/invites/{inviteId}": {
    delete: {
      responses: {
          200: { content: { "application/json": {
          "success": boolean;
        } } };
      };
    };
  };

  "/facilities/{facilityId}/invites/{inviteId}/resend": {
    post: {
      responses: {
          200: { content: { "application/json": components["schemas"]["FacilityInvite"] } };
      };
    };
  };

  "/facilities/{facilityId}/fulfillment-queue": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["FulfillmentQueueItem"]> } };
      };
    };
  };

  "/facilities/{facilityId}/fulfillment-queue/{itemId}/action": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["FulfillmentActionInput"] } };
      responses: {
          200: { content: { "application/json": components["schemas"]["FulfillmentQueueItem"] } };
      };
    };
  };

  "/doctor/appointments/today": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["Appointment"]> } };
      };
    };
  };

  "/doctor/queue/today": {
    get: {
      responses: {
          200: { content: { "application/json": Array<components["schemas"]["QueueEntry"]> } };
      };
    };
  };

  "/appointments/{appointmentId}/start": {
    post: {
      responses: {
          200: { content: { "application/json": components["schemas"]["Appointment"] } };
      };
    };
  };

  "/appointments/{appointmentId}/complete": {
    post: {
      responses: {
          200: { content: { "application/json": components["schemas"]["Appointment"] } };
      };
    };
  };

  "/doctor/queue/running-delay": {
    get: {
      responses: {
          200: { content: { "application/json": components["schemas"]["RunningDelay"] } };
      };
    };
    patch: {
      requestBody: { content: { "application/json": components["schemas"]["UpdateRunningDelayInput"] } };
      responses: {
          200: { content: { "application/json": components["schemas"]["RunningDelay"] } };
      };
    };
  };

  "/doctor/messages/threads": {
    get: {
      responses: {
          200: { content: { "application/json": components["schemas"]["ListThreadsResult"] } };
      };
    };
  };

  "/message-threads/{threadId}/read": {
    post: {
      responses: {

      };
    };
  };

  "/consultation-notes/{appointmentId}": {
    get: {
      responses: {
          200: { content: { "application/json": components["schemas"]["ConsultationNote"] } };
      };
    };
  };

  "/consultation-notes/{noteId}/sign-off": {
    post: {
      responses: {
          200: { content: { "application/json": components["schemas"]["ConsultationNote"] } };
      };
    };
  };

  "/consultation-notes/{noteId}/addenda": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["AddAddendumInput"] } };
      responses: {
          201: { content: { "application/json": components["schemas"]["ConsultationAddendum"] } };
      };
    };
  };

  "/doctor/insights": {
    get: {
      responses: {
          200: { content: { "application/json": components["schemas"]["DoctorPracticeInsights"] } };
      };
    };
  };

  "/payments/wallet-link": {
    get: {
      responses: {
          200: { content: { "application/json": components["schemas"]["WalletLink"] } };
      };
    };
    post: {
      requestBody: { content: { "application/json": components["schemas"]["LinkWalletInput"] } };
      responses: {
          200: { content: { "application/json": components["schemas"]["WalletLink"] } };
      };
    };
  };

  "/payments/intents": {
    post: {
      requestBody: { content: { "application/json": components["schemas"]["CreatePaymentIntentInput"] } };
      responses: {
          201: { content: { "application/json": components["schemas"]["PaymentIntent"] } };
      };
    };
  };

  "/payments/intents/{id}": {
    get: {
      responses: {
          200: { content: { "application/json": components["schemas"]["PaymentIntent"] } };
      };
    };
  };

  "/payments/intents/{id}/fund": {
    post: {
      responses: {
          200: { content: { "application/json": components["schemas"]["PaymentIntent"] } };
      };
    };
  };

  "/payments/intents/{id}/release": {
    post: {
      responses: {
          200: { content: { "application/json": components["schemas"]["PaymentIntent"] } };
      };
    };
  };

  "/payments/intents/{id}/refund": {
    post: {
      responses: {
          200: { content: { "application/json": components["schemas"]["PaymentIntent"] } };
      };
    };
  };
}
