import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../../test/render';
import { createSeedDb } from '../../../mocks/fixtures';
import type { FulfillmentQueueItem } from '../../../types/models';
import { FacilityFulfillmentQueue } from './FacilityFulfillmentQueue';

const queue = createSeedDb().fulfillmentQueue;

function renderQueue(overrides: Partial<FulfillmentQueueItem>[] = []) {
  const items = queue.map((item) => {
    const override = overrides.find((entry) => entry.id === item.id);
    return override ? { ...item, ...override } : item;
  });
  const onDispense = vi.fn().mockResolvedValue(undefined);
  const onReject = vi.fn().mockResolvedValue(undefined);
  render(
    <FacilityFulfillmentQueue
      items={items}
      onDispense={onDispense}
      onReject={onReject}
      isDispensing={false}
    />,
  );
  return { onDispense, onReject };
}

describe('FacilityFulfillmentQueue (#54)', () => {
  it('groups items by order and shows per-item quantities and partial status', () => {
    renderQueue();

    expect(screen.getByRole('heading', { name: /fulfillment queue/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Prescription for Pat Placeholder/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Lab order for Pat Placeholder/i)).toBeInTheDocument();

    const amox = screen.getByLabelText(/quantities for demo amoxicillin/i);
    expect(within(amox).getByText('30 capsules')).toBeInTheDocument();
    expect(within(amox).getByText('20 capsules')).toBeInTheDocument();
    expect(within(amox).getByText('10 capsules')).toBeInTheDocument();
    expect(screen.getAllByText('Partially dispensed').length).toBeGreaterThan(0);
  });

  it('dispenses only the quantity entered, bounded by what is outstanding', async () => {
    const { onDispense } = renderQueue();

    const quantityInput = screen.getByLabelText(
      /quantity of demo vitamin d 1000 iu \(fake\) to dispense/i,
    );
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '4');
    await userEvent.click(
      screen.getByRole('button', { name: /dispense demo vitamin d 1000 iu \(fake\)/i }),
    );

    expect(onDispense).toHaveBeenCalledWith('fuq-demo-5', 4);
  });

  it('blocks a quantity greater than the outstanding amount', async () => {
    const { onDispense } = renderQueue();

    const quantityInput = screen.getByLabelText(
      /quantity of demo vitamin d 1000 iu \(fake\) to dispense/i,
    );
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '11');
    await userEvent.click(
      screen.getByRole('button', { name: /dispense demo vitamin d 1000 iu \(fake\)/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/at most 10 capsules/i);
    expect(onDispense).not.toHaveBeenCalled();
  });

  it('shows an item dispensed elsewhere as blocked and disabled', () => {
    renderQueue([
      {
        id: 'fuq-demo-1',
        status: 'dispensed_elsewhere',
        canDispense: false,
        quantityDispensed: 30,
        quantityOutstanding: 0,
        dispensedByFacilityName: 'Example Chemist (fake)',
      },
    ]);

    expect(screen.getByText(/already dispensed elsewhere/i)).toBeInTheDocument();
    expect(screen.getByText(/dispensed by example chemist \(fake\)/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /dispense demo amoxicillin/i }),
    ).not.toBeInTheDocument();
  });

  it('rejects an item from the queue', async () => {
    const { onReject } = renderQueue();

    await userEvent.click(
      screen.getByRole('button', { name: /reject demo vitamin d 1000 iu \(fake\)/i }),
    );

    expect(onReject).toHaveBeenCalledWith('fuq-demo-5');
  });
});
