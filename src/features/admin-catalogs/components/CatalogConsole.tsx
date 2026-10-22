import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { useAuthStore } from '../../../store/auth-store';
import { catalogKeys } from '../../../query-keys';
import * as service from '../../../services/admin-catalogs-service';
import type { CatalogInput, CatalogItem, CatalogKind } from '../../../types/models';
import styles from './CatalogConsole.module.css';

const TABS: { key: CatalogKind | 'mappings'; label: string }[] = [
  { key: 'specialties', label: 'Specialties' }, { key: 'symptoms', label: 'Symptoms' },
  { key: 'medications', label: 'Medications' }, { key: 'lab-tests', label: 'Lab tests' }, { key: 'mappings', label: 'Symptom mappings' },
];
const PAGE_SIZE = 10;
const blank = { name: '', slug: '', description: '' };

export function CatalogConsole() {
  const token = useAuthStore((s) => s.accessToken)!;
  const client = useQueryClient();
  const [tab, setTab] = useState<CatalogKind | 'mappings'>('specialties');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<CatalogInput>(blank);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [retiring, setRetiring] = useState<CatalogItem | null>(null);
  const [notice, setNotice] = useState('');
  const catalog = tab === 'mappings' ? 'symptoms' : tab;
  const query = useQuery({ queryKey: catalogKeys.page(catalog, search, page, PAGE_SIZE), queryFn: ({ signal }) => service.listCatalog(catalog, { search, page, pageSize: PAGE_SIZE }, token, signal) });
  const usage = useQuery({ queryKey: retiring ? catalogKeys.usage(catalog, retiring.id) : catalogKeys.all, queryFn: ({ signal }) => service.getCatalogUsage(catalog, retiring!.id, token, signal), enabled: Boolean(retiring) });
  const refresh = () => client.invalidateQueries({ queryKey: catalogKeys.all });
  const save = useMutation({ mutationFn: () => editing ? service.updateCatalogItem(catalog, editing.id, draft, token) : service.createCatalogItem(catalog, draft, token), onSuccess: () => { setDraft(blank); setEditing(null); setNotice('Catalog item saved.'); void refresh(); } });
  const retire = useMutation({ mutationFn: () => service.retireCatalogItem(catalog, retiring!.id, token), onSuccess: () => { setRetiring(null); setNotice('Item retired. Existing records keep their saved snapshots.'); void refresh(); } });
  const startEdit = (item: CatalogItem) => { setEditing(item); setDraft({ name: item.name, slug: item.slug, description: item.description ?? '' }); };

  return <main className={styles.page}>
    <header><p className={styles.eyebrow}>ADMIN · PHASE W6</p><h1>Catalog management</h1><p>Curate the controlled vocabularies used for search, routing and fulfilment.</p></header>
    <div className={styles.tabs} role="tablist" aria-label="Catalogs">{TABS.map((item) => <button key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? styles.activeTab : ''} onClick={() => { setTab(item.key); setPage(1); setEditing(null); setNotice(''); }}>{item.label}</button>)}</div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {tab === 'mappings' ? <section className={styles.mapping}><h2>Symptom to specialty weights</h2><p>Choose a symptom to review its specialty routing weights.</p><label>Symptom<select value={editing?.id ?? ''} onChange={(e) => { const item = query.data?.items.find((candidate) => candidate.id === e.target.value); setEditing(item ?? null); }}><option value="">Select a symptom</option>{query.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{editing && <MappingEditor symptom={editing} token={token} onSaved={() => { setNotice('Symptom mappings saved.'); setEditing(null); }} />}</section> : <>
      <div className={styles.toolbar}><label>Search<input type="search" value={search} placeholder="Search name or slug" onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label><span>{query.data ? `${query.data.total} items` : ''}</span></div>
      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}><h2>{editing ? `Edit ${editing.name}` : `Add ${TABS.find((item) => item.key === tab)?.label.slice(0, -1)}`}</h2><div className={styles.fields}><label>Name<input required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label>Slug<input required maxLength={120} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></label><label>Description<input maxLength={500} value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label></div>{editing && draft.slug !== editing.slug && <p className={styles.warning}>Changing a slug may break links that use the current slug.</p>}<div className={styles.formActions}><Button type="submit" loading={save.isPending}>{save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create item'}</Button>{editing && <Button type="button" variant="secondary" onClick={() => { setEditing(null); setDraft(blank); }}>Cancel edit</Button>}</div>{save.error && <p role="alert" className={styles.warning}>Could not save this item. Refresh and try again.</p>}</form>
      {query.isLoading ? <p className={styles.loading}><Spinner size={20} /> Loading catalog…</p> : query.error ? <p role="alert" className={styles.warning}>Catalog unavailable. <button onClick={() => void query.refetch()}>Try again</button></p> : <div className={styles.tableWrap}><table><thead><tr><th>Name</th><th>Slug</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead><tbody>{query.data?.items.map((item) => <tr key={item.id}><td>{item.name}</td><td><code>{item.slug}</code></td><td>{item.usageCount}</td><td>{item.active ? 'Active' : 'Retired'}</td><td className={styles.actions}><button onClick={() => startEdit(item)}>Edit</button>{item.active && <button onClick={() => setRetiring(item)}>Retire</button>}</td></tr>)}</tbody></table>{query.data?.items.length === 0 && <p className={styles.empty}>No catalog items found.</p>}</div>}
      <nav className={styles.pager} aria-label="Catalog pages"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE))}</span><button disabled={page * PAGE_SIZE >= (query.data?.total ?? 0)} onClick={() => setPage((value) => value + 1)}>Next</button></nav>
    </>}
    {retiring && <div className={styles.backdrop}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="retire-title"><h2 id="retire-title">Retire {retiring.name}?</h2>{usage.isLoading ? <p>Checking usage…</p> : usage.error ? <p role="alert">Usage count could not be verified. <button onClick={() => void usage.refetch()}>Try again</button> before retiring.</p> : <p>This item is used by {usage.data?.usageCount ?? retiring.usageCount} {((usage.data?.usageCount ?? retiring.usageCount) === 1) ? 'record' : 'records'}. Retiring prevents new use; existing records keep their saved snapshots.</p>}{retire.error && <p role="alert" className={styles.warning}>Retirement failed. Refresh the catalog and try again.</p>}<div className={styles.formActions}><Button disabled={usage.isLoading || Boolean(usage.error)} loading={retire.isPending} onClick={() => retire.mutate()}>Confirm retirement</Button><Button variant="secondary" onClick={() => setRetiring(null)}>Cancel</Button></div></section></div>}
  </main>;
}

function MappingEditor({ symptom, token, onSaved }: { symptom: CatalogItem; token: string; onSaved: () => void }) {
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<string[]>([]);
  const mappings = useQuery({ queryKey: catalogKeys.mappings(symptom.id), queryFn: ({ signal }) => service.listSymptomMappings(symptom.id, token, signal) });
  const specialties = useQuery({ queryKey: catalogKeys.page('specialties', '', 1, 100), queryFn: ({ signal }) => service.listCatalog('specialties', { search: '', page: 1, pageSize: 100 }, token, signal) });
  const save = useMutation({ mutationFn: () => service.saveSymptomMappings(symptom.id, [...(mappings.data ?? []).map((mapping) => ({ specialtyId: mapping.specialtyId, weight: Number(weights[mapping.specialtyId] ?? mapping.weight) })), ...added.map((specialtyId) => ({ specialtyId, weight: Number(weights[specialtyId] ?? 0.5) }))], token), onSuccess: onSaved });
  const existing = new Set((mappings.data ?? []).map((mapping) => mapping.specialtyId));
  const available = (specialties.data?.items ?? []).filter((item) => !existing.has(item.id) && !added.includes(item.id));
  return <div><h3>Mappings for {symptom.name}</h3>{mappings.isLoading ? <p>Loading mappings…</p> : <>{(mappings.data ?? []).map((mapping) => <label className={styles.weight} key={mapping.specialtyId}>{mapping.specialtyName}<input aria-label={`${mapping.specialtyName} weight`} type="number" min="0" max="1" step="0.01" value={weights[mapping.specialtyId] ?? mapping.weight} onChange={(e) => setWeights({ ...weights, [mapping.specialtyId]: e.target.value })} /></label>)}{added.map((id) => { const specialty = specialties.data?.items.find((item) => item.id === id); return <label className={styles.weight} key={id}>{specialty?.name ?? id}<input aria-label={`${specialty?.name ?? id} weight`} type="number" min="0" max="1" step="0.01" value={weights[id] ?? '0.5'} onChange={(e) => setWeights({ ...weights, [id]: e.target.value })} /></label>; })}<label>Add specialty<select aria-label="Add specialty" value="" onChange={(e) => { if (e.target.value) setAdded([...added, e.target.value]); }}><option value="">Choose specialty…</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Button disabled={Boolean(specialties.error) || save.isPending} onClick={() => save.mutate()}>Save mappings</Button></>}{!mappings.isLoading && !mappings.data?.length && !added.length && <p>No mappings are configured for this symptom.</p>}{save.error && <p role="alert" className={styles.warning}>Could not save mappings. Try again.</p>}</div>;
}
