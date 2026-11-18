// Typed client for docforum-core's HTTP API.
//
// The package owns *shapes and paths*. It deliberately does not own
// transport concerns: base URL, `credentials: 'include'`, auth headers and
// the error envelope all live in docforum-web's `src/services/api-client.ts`
// (ARCHITECTURE_ESSENTIALS.md hard rule / "Where things live"). Callers pass
// an `ApiTransport` in, which keeps this package usable from tests and from
// any future runtime.
import type { components, paths } from './generated/schema';

export type { components, paths };
export type Schemas = components['schemas'];

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface CallOptions {
  accessToken?: string | null;
  signal?: AbortSignal;
  /** Milliseconds before the request fails with the transport's timeout error. */
  timeoutMs?: number;
  /** Stable key for one logical mutation attempt. Safe to retry. */
  idempotencyKey?: string;
}

export interface TransportOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
  /** Milliseconds before the request fails with the transport's timeout error. */
  timeoutMs?: number;
  /** Stable key for one logical mutation attempt. Safe to retry. */
  idempotencyKey?: string;
}

export interface ApiTransport {
  request<T>(path: string, options?: TransportOptions): Promise<T>;
  requestBlob(path: string, options?: TransportOptions): Promise<Blob>;
}

type Method = 'get' | 'post' | 'patch' | 'delete';
type Operation<P extends keyof paths, M extends Method> = M extends keyof paths[P] ? paths[P][M] : never;

/** JSON payload of the successful response(s) declared in the spec. */
export type SuccessResponse<Op> = Op extends { responses: infer R }
  ? {
      [S in keyof R]: S extends 200 | 201 | 202
        ? R[S] extends { content: { 'application/json': infer Body } }
          ? Body
          : void
        : never;
    }[keyof R]
  : void;

type Res<P extends keyof paths, M extends Method> = SuccessResponse<Operation<P, M>>;

export interface ListFacilitiesParams {
  type?: Schemas['FacilityType'];
  lat?: number;
  lng?: number;
  query?: string;
}

export interface ListThreadsParams {
  filter?: 'all' | 'unread' | 'closing_soon';
  cursor?: string | null;
  limit?: number;
}

export interface InsightsParams {
  preset?: Schemas['DateRangePreset'];
  startDate?: string;
  endDate?: string;
}

function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function createApiClient(transport: ApiTransport) {
  return {
    auth: {
      signup(input: Schemas['SignupInput'], options: CallOptions = {}): Promise<Res<'/auth/signup', 'post'>> {
        return transport.request('/auth/signup', { ...options, method: 'POST', body: input });
      },
      login(input: Schemas['LoginInput'], options: CallOptions = {}): Promise<Res<'/auth/login', 'post'>> {
        return transport.request('/auth/login', { ...options, method: 'POST', body: input });
      },
      logout(options: CallOptions = {}): Promise<void> {
        return transport.request<void>('/auth/logout', { ...options, method: 'POST' });
      },
      claimAccount(input: Schemas['ClaimAccountInput']): Promise<void> {
        return transport.request<void>('/auth/claim-account', { method: 'POST', body: input });
      },
    },

    account: {
      requestDataExport(
        input: Schemas['RequestDataExportInput'],
        options: CallOptions = {},
      ): Promise<Res<'/account/data-export', 'post'>> {
        return transport.request('/account/data-export', { ...options, method: 'POST', body: input });
      },
      getDataExport(options: CallOptions = {}): Promise<Res<'/account/data-export', 'get'>> {
        return transport.request('/account/data-export', options);
      },
      downloadDataExport(exportId: string, options: CallOptions = {}): Promise<Blob> {
        return transport.requestBlob(`/account/data-export/${encodeURIComponent(exportId)}/download`, options);
      },
      deleteAccount(
        input: Schemas['DeleteAccountInput'],
        options: CallOptions = {},
      ): Promise<Res<'/account/delete', 'post'>> {
        return transport.request('/account/delete', { ...options, method: 'POST', body: input });
      },
    },

    dependents: {
      list(options: CallOptions = {}): Promise<Res<'/patients/me/dependents', 'get'>> {
        return transport.request('/patients/me/dependents', options);
      },
      add(input: Schemas['DependentInput'], options: CallOptions = {}): Promise<Res<'/patients/me/dependents', 'post'>> {
        return transport.request('/patients/me/dependents', { ...options, method: 'POST', body: input });
      },
      update(
        id: string,
        input: Schemas['DependentInput'],
        options: CallOptions = {},
      ): Promise<Res<'/patients/me/dependents/{dependentId}', 'patch'>> {
        return transport.request(`/patients/me/dependents/${encodeURIComponent(id)}`, {
          ...options,
          method: 'PATCH',
          body: input,
        });
      },
      sendHandoverInvite(
        id: string,
        input: Schemas['HandoverInviteInput'],
        options: CallOptions = {},
      ): Promise<Res<'/patients/me/dependents/{dependentId}/handover-invite', 'post'>> {
        return transport.request(`/patients/me/dependents/${encodeURIComponent(id)}/handover-invite`, {
          ...options,
          method: 'POST',
          body: input,
        });
      },
      resendHandoverInvite(
        id: string,
        options: CallOptions = {},
      ): Promise<Res<'/patients/me/dependents/{dependentId}/handover-invite/resend', 'post'>> {
        return transport.request(`/patients/me/dependents/${encodeURIComponent(id)}/handover-invite/resend`, {
          ...options,
          method: 'POST',
        });
      },
    },

    health: {
      list(
        patientProfileId: string,
        section: Schemas['HealthSectionKey'],
        options: CallOptions = {},
      ): Promise<Res<'/patients/{patientProfileId}/health/{section}', 'get'>> {
        return transport.request(
          `/patients/${encodeURIComponent(patientProfileId)}/health/${encodeURIComponent(section)}`,
          options,
        );
      },
      add(
        patientProfileId: string,
        input: Schemas['HealthEntryInput'],
        options: CallOptions = {},
      ): Promise<Res<'/patients/{patientProfileId}/health', 'post'>> {
        return transport.request(`/patients/${encodeURIComponent(patientProfileId)}/health`, {
          ...options,
          method: 'POST',
          body: input,
        });
      },
      update(
        patientProfileId: string,
        entryId: string,
        input: Schemas['HealthEntryUpdate'],
        options: CallOptions = {},
      ): Promise<Res<'/patients/{patientProfileId}/health/{entryId}', 'patch'>> {
        return transport.request(
          `/patients/${encodeURIComponent(patientProfileId)}/health/${encodeURIComponent(entryId)}`,
          { ...options, method: 'PATCH', body: input },
        );
      },
      remove(patientProfileId: string, entryId: string, options: CallOptions = {}): Promise<void> {
        return transport.request<void>(
          `/patients/${encodeURIComponent(patientProfileId)}/health/${encodeURIComponent(entryId)}`,
          { ...options, method: 'DELETE' },
        );
      },
    },

    careThreads: {
      list(patientProfileId: string, options: CallOptions = {}): Promise<Res<'/patients/{patientProfileId}/care-threads', 'get'>> {
        return transport.request(`/patients/${encodeURIComponent(patientProfileId)}/care-threads`, options);
      },
      get(threadId: string, options: CallOptions = {}): Promise<Res<'/care-threads/{threadId}', 'get'>> {
        return transport.request(`/care-threads/${encodeURIComponent(threadId)}`, options);
      },
    },

    facilities: {
      list(params: ListFacilitiesParams = {}, options: CallOptions = {}): Promise<Res<'/facilities', 'get'>> {
        const qs = queryString({
          type: params.type,
          lat: params.lat,
          lng: params.lng,
          query: params.query,
        });
        return transport.request(`/facilities${qs}`, options);
      },
    },

    facilityTeam: {
      listMembers(facilityId: string, options: CallOptions = {}): Promise<Res<'/facilities/{facilityId}/members', 'get'>> {
        return transport.request(`/facilities/${encodeURIComponent(facilityId)}/members`, options);
      },
      removeMember(
        facilityId: string,
        memberId: string,
        options: CallOptions = {},
      ): Promise<Res<'/facilities/{facilityId}/members/{memberId}', 'delete'>> {
        return transport.request(
          `/facilities/${encodeURIComponent(facilityId)}/members/${encodeURIComponent(memberId)}`,
          { ...options, method: 'DELETE' },
        );
      },
      listInvites(facilityId: string, options: CallOptions = {}): Promise<Res<'/facilities/{facilityId}/invites', 'get'>> {
        return transport.request(`/facilities/${encodeURIComponent(facilityId)}/invites`, options);
      },
      inviteMember(
        facilityId: string,
        input: Schemas['InviteMemberInput'],
        options: CallOptions = {},
      ): Promise<Res<'/facilities/{facilityId}/invites', 'post'>> {
        return transport.request(`/facilities/${encodeURIComponent(facilityId)}/invites`, {
          ...options,
          method: 'POST',
          body: input,
        });
      },
      resendInvite(
        facilityId: string,
        inviteId: string,
        options: CallOptions = {},
      ): Promise<Res<'/facilities/{facilityId}/invites/{inviteId}/resend', 'post'>> {
        return transport.request(
          `/facilities/${encodeURIComponent(facilityId)}/invites/${encodeURIComponent(inviteId)}/resend`,
          { ...options, method: 'POST' },
        );
      },
      revokeInvite(
        facilityId: string,
        inviteId: string,
        options: CallOptions = {},
      ): Promise<Res<'/facilities/{facilityId}/invites/{inviteId}', 'delete'>> {
        return transport.request(
          `/facilities/${encodeURIComponent(facilityId)}/invites/${encodeURIComponent(inviteId)}`,
          { ...options, method: 'DELETE' },
        );
      },
      getFulfillmentQueue(
        facilityId: string,
        options: CallOptions = {},
      ): Promise<Res<'/facilities/{facilityId}/fulfillment-queue', 'get'>> {
        return transport.request(`/facilities/${encodeURIComponent(facilityId)}/fulfillment-queue`, options);
      },
      updateFulfillmentItem(
        facilityId: string,
        itemId: string,
        input: Schemas['FulfillmentActionInput'],
        options: CallOptions = {},
      ): Promise<Res<'/facilities/{facilityId}/fulfillment-queue/{itemId}/action', 'post'>> {
        return transport.request(
          `/facilities/${encodeURIComponent(facilityId)}/fulfillment-queue/${encodeURIComponent(itemId)}/action`,
          { ...options, method: 'POST', body: input },
        );
      },
    },

    queue: {
      listTodayAppointments(options: CallOptions = {}): Promise<Res<'/doctor/appointments/today', 'get'>> {
        return transport.request('/doctor/appointments/today', options);
      },
      list(options: CallOptions = {}): Promise<Res<'/doctor/queue/today', 'get'>> {
        return transport.request('/doctor/queue/today', options);
      },
      startVisit(
        appointmentId: string,
        options: CallOptions = {},
      ): Promise<Res<'/appointments/{appointmentId}/start', 'post'>> {
        return transport.request(`/appointments/${encodeURIComponent(appointmentId)}/start`, {
          ...options,
          method: 'POST',
        });
      },
      completeVisit(
        appointmentId: string,
        options: CallOptions = {},
      ): Promise<Res<'/appointments/{appointmentId}/complete', 'post'>> {
        return transport.request(`/appointments/${encodeURIComponent(appointmentId)}/complete`, {
          ...options,
          method: 'POST',
        });
      },
      getRunningDelay(options: CallOptions = {}): Promise<Res<'/doctor/queue/running-delay', 'get'>> {
        return transport.request('/doctor/queue/running-delay', options);
      },
      updateRunningDelay(
        input: Schemas['UpdateRunningDelayInput'],
        options: CallOptions = {},
      ): Promise<Res<'/doctor/queue/running-delay', 'patch'>> {
        return transport.request('/doctor/queue/running-delay', {
          ...options,
          method: 'PATCH',
          body: input,
        });
      },
    },

    messaging: {
      listThreads(params: ListThreadsParams = {}, options: CallOptions = {}): Promise<Res<'/doctor/messages/threads', 'get'>> {
        const qs = queryString({
          filter: params.filter === 'all' ? undefined : params.filter,
          cursor: params.cursor,
          limit: params.limit,
        });
        return transport.request(`/doctor/messages/threads${qs}`, options);
      },
      markThreadRead(threadId: string, options: CallOptions = {}): Promise<void> {
        return transport.request<void>(`/message-threads/${encodeURIComponent(threadId)}/read`, {
          ...options,
          method: 'POST',
        });
      },
    },

    consultation: {
      getNote(
        appointmentId: string,
        options: CallOptions = {},
      ): Promise<Res<'/consultation-notes/{appointmentId}', 'get'>> {
        return transport.request(`/consultation-notes/${encodeURIComponent(appointmentId)}`, options);
      },
      signOff(
        noteId: string,
        options: CallOptions = {},
      ): Promise<Res<'/consultation-notes/{noteId}/sign-off', 'post'>> {
        return transport.request(`/consultation-notes/${encodeURIComponent(noteId)}/sign-off`, {
          ...options,
          method: 'POST',
        });
      },
      addAddendum(
        noteId: string,
        input: Schemas['AddAddendumInput'],
        options: CallOptions = {},
      ): Promise<Res<'/consultation-notes/{noteId}/addenda', 'post'>> {
        return transport.request(`/consultation-notes/${encodeURIComponent(noteId)}/addenda`, {
          ...options,
          method: 'POST',
          body: input,
        });
      },
    },

    insights: {
      get(params: InsightsParams = {}, options: CallOptions = {}): Promise<Res<'/doctor/insights', 'get'>> {
        const qs = queryString({
          preset: params.preset,
          startDate: params.startDate,
          endDate: params.endDate,
        });
        return transport.request(`/doctor/insights${qs}`, options);
      },
    },

    payments: {
      linkWallet(input: Schemas['LinkWalletInput'], options: CallOptions = {}): Promise<Res<'/payments/wallet-link', 'post'>> {
        return transport.request('/payments/wallet-link', { ...options, method: 'POST', body: input });
      },
      getOwnWalletLink(options: CallOptions = {}): Promise<Res<'/payments/wallet-link', 'get'>> {
        return transport.request('/payments/wallet-link', options);
      },
      createIntent(
        input: Schemas['CreatePaymentIntentInput'],
        options: CallOptions = {},
      ): Promise<Res<'/payments/intents', 'post'>> {
        return transport.request('/payments/intents', { ...options, method: 'POST', body: input });
      },
      getIntent(id: string, options: CallOptions = {}): Promise<Res<'/payments/intents/{id}', 'get'>> {
        return transport.request(`/payments/intents/${encodeURIComponent(id)}`, options);
      },
      fundIntent(id: string, options: CallOptions = {}): Promise<Res<'/payments/intents/{id}/fund', 'post'>> {
        return transport.request(`/payments/intents/${encodeURIComponent(id)}/fund`, {
          ...options,
          method: 'POST',
        });
      },
      releaseIntent(id: string, options: CallOptions = {}): Promise<Res<'/payments/intents/{id}/release', 'post'>> {
        return transport.request(`/payments/intents/${encodeURIComponent(id)}/release`, {
          ...options,
          method: 'POST',
        });
      },
      refundIntent(id: string, options: CallOptions = {}): Promise<Res<'/payments/intents/{id}/refund', 'post'>> {
        return transport.request(`/payments/intents/${encodeURIComponent(id)}/refund`, {
          ...options,
          method: 'POST',
        });
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
