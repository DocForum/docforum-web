// Intake draft store tests (issue #36).
//
// Asserts that the store never writes to localStorage, sessionStorage, or IndexedDB.
// This is a hard requirement per ARCHITECTURE_ESSENTIALS.md.

import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useIntakeDraftStore } from './intake-draft-store';

describe('IntakeDraftStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    useIntakeDraftStore.getState().clearAllDrafts();
  });

  afterEach(() => {
    // Clean up after each test
    useIntakeDraftStore.getState().clearAllDrafts();
  });

  it('should save and retrieve drafts', () => {
    const { result } = renderHook(() => useIntakeDraftStore());

    const slotId = 'slot-123';
    const draft = {
      chiefComplaint: 'Headache',
      symptomDuration: '2 days',
      severity: 5,
      currentMedications: ['Aspirin'],
      allergies: ['Penicillin'],
      notes: 'Some notes',
    };

    result.current.saveDraft(slotId, draft);

    const retrieved = result.current.getDraft(slotId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.slotId).toBe(slotId);
    expect(retrieved?.draft).toEqual(draft);
  });

  it('should clear a specific draft', () => {
    const { result } = renderHook(() => useIntakeDraftStore());

    const slotId = 'slot-123';
    const draft = {
      chiefComplaint: 'Headache',
      symptomDuration: null,
      severity: null,
      currentMedications: [],
      allergies: [],
      notes: null,
    };

    result.current.saveDraft(slotId, draft);
    expect(result.current.getDraft(slotId)).toBeDefined();

    result.current.clearDraft(slotId);
    expect(result.current.getDraft(slotId)).toBeUndefined();
  });

  it('should clear all drafts', () => {
    const { result } = renderHook(() => useIntakeDraftStore());

    const draft = {
      chiefComplaint: 'Headache',
      symptomDuration: null,
      severity: null,
      currentMedications: [],
      allergies: [],
      notes: null,
    };

    result.current.saveDraft('slot-1', draft);
    result.current.saveDraft('slot-2', draft);

    expect(result.current.getDraft('slot-1')).toBeDefined();
    expect(result.current.getDraft('slot-2')).toBeDefined();

    result.current.clearAllDrafts();

    expect(result.current.getDraft('slot-1')).toBeUndefined();
    expect(result.current.getDraft('slot-2')).toBeUndefined();
  });

  it('should update an existing draft', () => {
    const { result } = renderHook(() => useIntakeDraftStore());

    const slotId = 'slot-123';
    const draft1 = {
      chiefComplaint: 'Headache',
      symptomDuration: null,
      severity: null,
      currentMedications: [],
      allergies: [],
      notes: null,
    };

    result.current.saveDraft(slotId, draft1);

    const draft2 = {
      ...draft1,
      chiefComplaint: 'Stomach pain',
    };

    result.current.saveDraft(slotId, draft2);

    const retrieved = result.current.getDraft(slotId);
    expect(retrieved?.draft.chiefComplaint).toBe('Stomach pain');
  });

  it('should never write to localStorage', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem');

    const { result } = renderHook(() => useIntakeDraftStore());

    const draft = {
      chiefComplaint: 'Headache',
      symptomDuration: null,
      severity: null,
      currentMedications: [],
      allergies: [],
      notes: null,
    };

    result.current.saveDraft('slot-123', draft);
    result.current.clearDraft('slot-123');
    result.current.clearAllDrafts();

    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  it('should never write to sessionStorage', () => {
    const setItemSpy = vi.spyOn(sessionStorage, 'setItem');

    const { result } = renderHook(() => useIntakeDraftStore());

    const draft = {
      chiefComplaint: 'Headache',
      symptomDuration: null,
      severity: null,
      currentMedications: [],
      allergies: [],
      notes: null,
    };

    result.current.saveDraft('slot-123', draft);
    result.current.clearDraft('slot-123');
    result.current.clearAllDrafts();

    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  it('should never access IndexedDB', () => {
    const openSpy = vi.spyOn(indexedDB, 'open');

    const { result } = renderHook(() => useIntakeDraftStore());

    const draft = {
      chiefComplaint: 'Headache',
      symptomDuration: null,
      severity: null,
      currentMedications: [],
      allergies: [],
      notes: null,
    };

    result.current.saveDraft('slot-123', draft);
    result.current.clearDraft('slot-123');
    result.current.clearAllDrafts();

    expect(openSpy).not.toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
