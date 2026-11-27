import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { DatePicker } from '../../../components/DatePicker';
import { TextField } from '../../../components/TextField';
import { TimePicker } from '../../../components/TimePicker';
import {
  useCreateFacilityPrice,
  useFacilityPrices,
  useSearchCatalogItems,
} from '../hooks/useFacilitySettings';
import { useT } from '../../../i18n/useT';
import type { CatalogItem, FacilityPrice, PayoutAsset } from '../../../types/models';
import {
  ASSET_DECIMALS,
  formatAmountFromStroops,
  parseAssetAmount,
  parseEffectiveFrom,
  toLocalDateTimeInput,
} from '../validation';
import styles from './FacilitySettings.module.css';
import { formatInstant } from '../../../i18n/format';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';

interface PriceListEditorProps {
  facilityId: string;
  onDirtyChange: (dirty: boolean) => void;
}

type PriceStatus = 'current' | 'scheduled' | 'superseded';

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
): PriceStatus {
  if (new Date(price.effectiveFrom).getTime() > now) return 'scheduled';
  const current = currentPriceFor(prices, price.catalogItemCode, price.asset, now);
  return current?.id === price.id ? 'current' : 'superseded';
}

export function PriceListEditor({ facilityId, onDirtyChange }: PriceListEditorProps) {
  const t = useT();
  const { locale } = useIntl();
  // Effective-from is an instant; show it in the user's configured zone and
  // name the zone so it is never ambiguous (issue #255).
  const { timeZone } = useTimeZone();
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

  const itemTypeLabel = (item: CatalogItem) =>
    item.type === 'pharmacy'
      ? t('facilitySettings.price.itemTypeMedication', 'Medication')
      : t('facilitySettings.price.itemTypeLabTest', 'Lab test');

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

    const parsedAmount = parseAssetAmount(amount, asset, t);
    const parsedEffective = parseEffectiveFrom(effectiveFrom, t);
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

  const statusLabel = (status: PriceStatus) =>
    status === 'current'
      ? t('facilitySettings.price.statusCurrent', 'Current')
      : status === 'scheduled'
        ? t('facilitySettings.price.statusScheduled', 'Scheduled')
        : t('facilitySettings.price.statusSuperseded', 'Superseded');

  return (
    <section className={styles.card} aria-labelledby="facility-prices-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="facility-prices-heading">{t('facilitySettings.price.title', 'Price list')}</h2>
          <p className={styles.cardSubtitle}>
            {t('facilitySettings.price.subtitle', 'Search the catalog, set the price patients pay at this facility, and keep an effective-from history for every change.')}
          </p>
        </div>
        {isDirty && <span className={styles.unsavedBadge}>{t('facilitySettings.price.unsaved', 'Unsaved price')}</span>}
      </div>

      <div className={styles.priceRuleNotice} role="note">
        <strong>{t('facilitySettings.price.ruleLabel', 'How price changes work:')}</strong>{' '}
        {t('facilitySettings.price.ruleText', 'saving creates a new version for future orders. Payment intents that already exist keep the amount snapshotted when they were created, so changing a price here never alters an existing payment.')}
      </div>

      <form className={styles.searchForm} onSubmit={handleSearch} role="search">
        <TextField
          label={t('facilitySettings.price.searchLabel', 'Search catalog items')}
          type="search"
          placeholder={t('facilitySettings.price.searchPlaceholder', 'Try a medication or test name or code')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" variant="secondary" loading={searchMutation.isPending}>
          {t('facilitySettings.price.searchButton', 'Search catalog')}
        </Button>
      </form>

      {searchMutation.error && (
        <div className={styles.errorBox} role="alert">
          {t('facilitySettings.price.searchError', 'Catalog search failed: {message}', {
            message: searchMutation.error.message,
          })}
        </div>
      )}

      {searchMutation.isPending && (
        <div className={styles.loadingRow} role="status">
          <Spinner size={16} /> {t('facilitySettings.price.searching', 'Searching catalog…')}
        </div>
      )}

      {results && !searchMutation.isPending && (
        <div className={styles.searchResults} aria-label={t('facilitySettings.price.resultsLabel', 'Catalog search results')}>
          {results.length === 0 ? (
            <p className={styles.emptyText}>
              {t('facilitySettings.price.noMatches', 'No catalog items matched “{query}”.', { query })}
            </p>
          ) : (
            <ul className={styles.resultList}>
              {results.map((item) => (
                <li key={item.code} className={styles.resultRow}>
                  <div>
                    <div className={styles.resultName}>{item.name}</div>
                    <div className={styles.resultMeta}>
                      <code>{item.code}</code> · {itemTypeLabel(item)}
                      {item.description ? ` · ${item.description}` : ''}
                    </div>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => chooseItem(item)}>
                    {t('facilitySettings.price.setPrice', 'Set price')}
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
                <code>{selected.code}</code> · {itemTypeLabel(selected)}
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
              {t('facilitySettings.price.clear', 'Clear')}
            </Button>
          </div>

          <div className={styles.priceFields}>
            <div className={styles.selectField}>
              <label htmlFor="price-asset">{t('facilitySettings.price.assetLabel', 'Payment asset')}</label>
              <select
                id="price-asset"
                value={asset}
                onChange={(event) => chooseAsset(event.target.value as PayoutAsset)}
              >
                <option value="XLM">{t('facilitySettings.price.assetXlm', 'XLM (Stellar Lumens)')}</option>
                <option value="USDC">{t('facilitySettings.price.assetUsdc', 'USDC (USD Coin)')}</option>
              </select>
              <span className={styles.helperText}>
                {t('facilitySettings.price.decimalsHint', '{asset} supports up to {decimals} decimal places.', {
                  asset,
                  decimals: ASSET_DECIMALS[asset],
                })}
              </span>
            </div>

            <TextField
              label={t('facilitySettings.price.perUnit', 'Price per unit ({asset})', { asset })}
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setSaved(false);
                setAmount(event.target.value);
              }}
              error={amountError ?? undefined}
              required
            />

            {/* `effectiveFrom` stays a `YYYY-MM-DDTHH:mm` local string (what
                the old datetime-local input produced), split across an
                accessible date and time picker (issue #114). */}
            <DatePicker
              label={t('facilitySettings.price.effectiveFromDate', 'Effective from (date)')}
              value={effectiveFrom.slice(0, 10)}
              onChange={(date) => {
                setSaved(false);
                setEffectiveFrom(date ? `${date}T${effectiveFrom.slice(11, 16) || '00:00'}` : '');
              }}
              error={effectiveError ?? undefined}
              required
            />
            <TimePicker
              label={t('facilitySettings.price.effectiveFromTime', 'Effective from (time)')}
              value={effectiveFrom.slice(11, 16)}
              onChange={(time) => {
                setSaved(false);
                const date = effectiveFrom.slice(0, 10);
                setEffectiveFrom(date && time ? `${date}T${time}` : date ? `${date}T` : '');
              }}
              required
            />
          </div>

          <p className={styles.helperText}>
            {t('facilitySettings.price.amountsHint', 'Amounts are entered as decimals and sent as BigInt-safe stroops. Existing payment intents are never repriced.')}
          </p>

          {createMutation.error && (
            <div className={styles.errorBox} role="alert">
              {t('facilitySettings.price.saveError', 'Could not save price: {message}', {
                message: createMutation.error.message,
              })}
            </div>
          )}
          {saved && (
            <div className={styles.successBox} role="status">
              {t('facilitySettings.price.saved', 'New price version saved. Future payment intents will use it from the effective time.')}
            </div>
          )}

          <div className={styles.actions}>
            <Button type="submit" loading={createMutation.isPending}>
              {t('facilitySettings.price.addVersion', 'Add price version')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDiscard}
              disabled={createMutation.isPending || !isDirty}
            >
              {t('facilitySettings.common.discard', 'Discard changes')}
            </Button>
          </div>
        </form>
      )}

      <div className={styles.historyHeader}>
        <div>
          <h3>{t('facilitySettings.price.historyTitle', 'Effective-from history')}</h3>
          <p className={styles.helperText}>
            {t('facilitySettings.price.historyHint', 'Newest first. “Current” is the price in force now; scheduled versions apply later.')}
          </p>
        </div>
        {isLoading && <Spinner size={16} />}
      </div>

      {error && (
        <div className={styles.errorBox} role="alert">
          {t('facilitySettings.price.loadError', 'Could not load the price list: {message}', {
            message: error.message,
          })}
        </div>
      )}

      {!isLoading && !error && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <caption className={styles.tableCaption}>
              {t('facilitySettings.price.versionsCaption', 'Facility price versions ({count, plural, one {# version} other {# versions}})', {
                count: prices.length,
              })}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t('facilitySettings.price.colItem', 'Catalog item')}</th>
                <th scope="col">{t('facilitySettings.price.colAsset', 'Asset')}</th>
                <th scope="col">{t('facilitySettings.price.colPrice', 'Price')}</th>
                <th scope="col">{t('facilitySettings.price.colEffectiveFrom', 'Effective from')}</th>
                <th scope="col">{t('facilitySettings.price.colStatus', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {prices.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    {t('facilitySettings.price.noPrices', 'No prices yet. Search the catalog to add the first one.')}
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
                        <td>{formatInstant(price.effectiveFrom, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }, locale, timeZone)}</td>
                        <td>
                          <span
                            className={`${styles.statusPill} ${
                              status === 'current'
                                ? styles.statusCurrent
                                : status === 'scheduled'
                                  ? styles.statusScheduled
                                  : styles.statusSuperseded
                            }`}
                          >
                            {statusLabel(status)}
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
