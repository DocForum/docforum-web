import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { TextField } from '../../../components/TextField';
import {
  useCreateFacilityPrice,
  useFacilityPrices,
  useSearchCatalogItems,
} from '../hooks/useFacilitySettings';
import type { CatalogItem, FacilityPrice, PayoutAsset } from '../../../types/models';
import {
  ASSET_DECIMALS,
  formatAmountFromStroops,
  parseAssetAmount,
  parseEffectiveFrom,
  toLocalDateTimeInput,
} from '../validation';
import styles from './FacilitySettings.module.css';

interface PriceListEditorProps {
  facilityId: string;
  onDirtyChange: (dirty: boolean) => void;
}

function currentPriceFor(
  prices: FacilityPrice[],
  catalogItemCode: string,
  asset: PayoutAsset,
  now = Date.now(),
): FacilityPrice | null {
  return (
    prices
      .filter(
        (price) =>
          price.catalogItemCode === catalogItemCode &&
          price.asset === asset &&
          new Date(price.effectiveFrom).getTime() <= now,
      )
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0] ??
    null
  );
}

function priceStatus(
  price: FacilityPrice,
  prices: FacilityPrice[],
  now = Date.now(),
): 'Current' | 'Scheduled' | 'Superseded' {
  if (new Date(price.effectiveFrom).getTime() > now) return 'Scheduled';
  const current = currentPriceFor(prices, price.catalogItemCode, price.asset, now);
  return current?.id === price.id ? 'Current' : 'Superseded';
}

export function PriceListEditor({ facilityId, onDirtyChange }: PriceListEditorProps) {
  const { data: prices = [], isLoading, error } = useFacilityPrices(facilityId);
  const searchMutation = useSearchCatalogItems();
  const createMutation = useCreateFacilityPrice(facilityId);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogItem[] | null>(null);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [asset, setAsset] = useState<PayoutAsset>('XLM');
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(() => toLocalDateTimeInput(new Date()));
  const [baseline, setBaseline] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [effectiveError, setEffectiveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty =
    Boolean(selected) && JSON.stringify({ asset, amount, effectiveFrom }) !== baseline;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const chooseItem = (item: CatalogItem, nextAsset: PayoutAsset = asset) => {
    const current = currentPriceFor(prices, item.code, nextAsset);
    const nextAmount = current ? formatAmountFromStroops(current.amountStroops, nextAsset) : '';
    const nextEffectiveFrom = toLocalDateTimeInput(new Date());
    setSelected(item);
    setAsset(nextAsset);
    setAmount(nextAmount);
    setEffectiveFrom(nextEffectiveFrom);
    setBaseline(JSON.stringify({ asset: nextAsset, amount: nextAmount, effectiveFrom: nextEffectiveFrom }));
    setAmountError(null);
    setEffectiveError(null);
    setSaved(false);
  };

  const chooseAsset = (nextAsset: PayoutAsset) => {
    if (!selected) {
      setAsset(nextAsset);
      return;
    }
    const current = currentPriceFor(prices, selected.code, nextAsset);
    const nextAmount = current ? formatAmountFromStroops(current.amountStroops, nextAsset) : '';
    setAsset(nextAsset);
    setAmount(nextAmount);
    setAmountError(null);
    setSaved(false);
    setBaseline(
      JSON.stringify({ asset: nextAsset, amount: nextAmount, effectiveFrom }),
    );
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    searchMutation.mutate(query, {
      onSuccess: (items) => setResults(items),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSaved(false);

    const parsedAmount = parseAssetAmount(amount, asset);
    const parsedEffective = parseEffectiveFrom(effectiveFrom);
    setAmountError(parsedAmount.error);
    setEffectiveError(parsedEffective.error);
    if (!parsedAmount.amountStroops || !parsedEffective.iso) return;

    try {
      await createMutation.mutateAsync({
        catalogItemCode: selected.code,
        asset,
        amountStroops: parsedAmount.amountStroops,
        effectiveFrom: parsedEffective.iso,
      });
      const nextBaseline = JSON.stringify({ asset, amount, effectiveFrom });
      setBaseline(nextBaseline);
      setSaved(true);
      onDirtyChange(false);
    } catch {
      // The mutation error is rendered below.
    }
  };

  const handleDiscard = () => {
    if (selected) {
      chooseItem(selected, asset);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="facility-prices-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-prices-heading">Price list</h2>
          <p className={styles.cardSubtitle}>
            Search the catalog, set the price patients pay at this facility, and keep an
            effective-from history for every change.
          </p>
        </div>
        {isDirty && <span className={styles.unsavedBadge}>Unsaved price</span>}
      </div>

      <div className={styles.priceRuleNotice} role="note">
        <strong>How price changes work:</strong> saving creates a new version for future orders.
        Payment intents that already exist keep the amount snapshotted when they were created, so
        changing a price here never alters an existing payment.
      </div>

      <form className={styles.searchForm} onSubmit={handleSearch} role="search">
        <TextField
          label="Search catalog items"
          type="search"
          placeholder="Try a medication or test name or code"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" variant="secondary" loading={searchMutation.isPending}>
          Search catalog
        </Button>
      </form>

      {searchMutation.error && (
        <div className={styles.errorBox} role="alert">
          Catalog search failed: {searchMutation.error.message}
        </div>
      )}

      {searchMutation.isPending && (
        <div className={styles.loadingRow} role="status">
          <Spinner size={16} /> Searching catalog…
        </div>
      )}

      {results && !searchMutation.isPending && (
        <div className={styles.searchResults} aria-label="Catalog search results">
          {results.length === 0 ? (
            <p className={styles.emptyText}>No catalog items matched “{query}”.</p>
          ) : (
            <ul className={styles.resultList}>
              {results.map((item) => (
                <li key={item.code} className={styles.resultRow}>
                  <div>
                    <div className={styles.resultName}>{item.name}</div>
                    <div className={styles.resultMeta}>
                      <code>{item.code}</code> · {item.type === 'pharmacy' ? 'Medication' : 'Lab test'}
                      {item.description ? ` · ${item.description}` : ''}
                    </div>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => chooseItem(item)}>
                    Set price
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <form className={styles.priceForm} onSubmit={handleSubmit} noValidate>
          <div className={styles.selectedItemHeader}>
            <div>
              <h3>{selected.name}</h3>
              <p className={styles.resultMeta}>
                <code>{selected.code}</code> · {selected.type === 'pharmacy' ? 'Medication' : 'Lab test'}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSelected(null);
                setResults(null);
                setSaved(false);
                onDirtyChange(false);
              }}
            >
              Clear
            </Button>
          </div>

          <div className={styles.priceFields}>
            <div className={styles.selectField}>
              <label htmlFor="price-asset">Payment asset</label>
              <select
                id="price-asset"
                value={asset}
                onChange={(event) => chooseAsset(event.target.value as PayoutAsset)}
              >
                <option value="XLM">XLM (Stellar Lumens)</option>
                <option value="USDC">USDC (USD Coin)</option>
              </select>
              <span className={styles.helperText}>
                {asset} supports up to {ASSET_DECIMALS[asset]} decimal places.
              </span>
            </div>

            <TextField
              label={`Price per unit (${asset})`}
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setSaved(false);
                setAmount(event.target.value);
              }}
              error={amountError ?? undefined}
              required
            />

            <TextField
              label="Effective from"
              type="datetime-local"
              value={effectiveFrom}
              onChange={(event) => {
                setSaved(false);
                setEffectiveFrom(event.target.value);
              }}
              error={effectiveError ?? undefined}
              required
            />
          </div>

          <p className={styles.helperText}>
            Amounts are entered as decimals and sent as BigInt-safe stroops. Existing payment
            intents are never repriced.
          </p>

          {createMutation.error && (
            <div className={styles.errorBox} role="alert">
              Could not save price: {createMutation.error.message}
            </div>
          )}
          {saved && (
            <div className={styles.successBox} role="status">
              New price version saved. Future payment intents will use it from the effective time.
            </div>
          )}

          <div className={styles.actions}>
            <Button type="submit" loading={createMutation.isPending}>
              Add price version
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDiscard}
              disabled={createMutation.isPending || !isDirty}
            >
              Discard changes
            </Button>
          </div>
        </form>
      )}

      <div className={styles.historyHeader}>
        <div>
          <h3>Effective-from history</h3>
          <p className={styles.helperText}>
            Newest first. “Current” is the price in force now; scheduled versions apply later.
          </p>
        </div>
        {isLoading && <Spinner size={16} />}
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          Could not load the price list: {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <caption className={styles.tableCaption}>
              Facility price versions ({prices.length} {prices.length === 1 ? 'version' : 'versions'})
            </caption>
            <thead>
              <tr>
                <th scope="col">Catalog item</th>
                <th scope="col">Asset</th>
                <th scope="col">Price</th>
                <th scope="col">Effective from</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {prices.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    No prices yet. Search the catalog to add the first one.
                  </td>
                </tr>
              ) : (
                [...prices]
                  .sort(
                    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime(),
                  )
                  .map((price) => {
                    const status = priceStatus(price, prices);
                    return (
                      <tr key={price.id}>
                        <td>
                          <div className={styles.resultName}>{price.catalogItemName}</div>
                          <div className={styles.resultMeta}>
                            <code>{price.catalogItemCode}</code>
                          </div>
                        </td>
                        <td>{price.asset}</td>
                        <td className={styles.amountCell}>
                          {formatAmountFromStroops(price.amountStroops, price.asset)} {price.asset}
                        </td>
                        <td>{new Date(price.effectiveFrom).toLocaleString()}</td>
                        <td>
                          <span
                            className={`${styles.statusPill} ${
                              status === 'Current'
                                ? styles.statusCurrent
                                : status === 'Scheduled'
                                  ? styles.statusScheduled
                                  : styles.statusSuperseded
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
