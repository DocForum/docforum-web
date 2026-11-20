// --- Admin controlled vocabularies (Phase W6, issue #67; provisional until
// docforum-core catalog contracts land) -----------------------------------
export type CatalogKind = 'specialties' | 'symptoms' | 'medications' | 'lab-tests';

export interface AdminCatalogItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  active: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCatalogPage {
  items: AdminCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminCatalogInput {
  name: string;
  slug: string;
  description?: string;
}

export interface AdminSymptomSpecialtyMapping {
  id: string;
  symptomId: string;
  specialtyId: string;
  specialtyName: string;
  weight: number;
}

export interface AdminSymptomMappingInput {
  specialtyId: string;
  weight: number;
}
