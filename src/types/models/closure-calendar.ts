// --- Closure calendar management (this PR) -------------------------------
export type ClosureStatus = 'active' | 'inactive';

export interface Closure {
  id: string;
  name: string;
  description?: string | null;
  status: ClosureStatus;
  allDay: boolean;
  start: string; // ISO datetime (timezone-aware)
  end: string; // ISO datetime (timezone-aware), exclusive end
  facilityId?: string | null; // null = platform-wide, otherwise scoped to facility
  createdAt: string;
  updatedAt: string;
}

export interface CreateClosureInput {
  name: string;
  description?: string | null;
  status?: ClosureStatus;
  allDay: boolean;
  start: string; // ISO datetime (timezone-aware)
  end: string; // ISO datetime (timezone-aware), exclusive end
  facilityId?: string | null; // null = platform-wide
}

export interface UpdateClosureInput {
  id: string;
  name?: string;
  description?: string | null;
  status?: ClosureStatus;
  allDay?: boolean;
  start?: string;
  end?: string;
  facilityId?: string | null;
}
