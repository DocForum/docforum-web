import type { PatientOrder } from '../../types/models';

export interface CurrentOrderEntry {
  order: PatientOrder;
  history: PatientOrder[];
}

function latestOf(orders: PatientOrder[]): PatientOrder {
  return [...orders].sort((a, b) => {
    if (b.version !== a.version) return b.version - a.version;
    return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
  })[0];
}

export function currentOrderVersions(orders: PatientOrder[]): CurrentOrderEntry[] {
  const byId = new Map(orders.map((order) => [order.id, order]));
  const groups = new Map<string, PatientOrder[]>();

  for (const order of orders) {
    const seen = new Set<string>();
    let root = order;
    while (root.supersedesId && byId.has(root.supersedesId)) {
      if (seen.has(root.id)) break;
      seen.add(root.id);
      root = byId.get(root.supersedesId)!;
    }
    const group = groups.get(root.id) ?? [];
    group.push(order);
    groups.set(root.id, group);
  }

  const entries: CurrentOrderEntry[] = [];
  for (const group of groups.values()) {
    const supersededIds = new Set(
      group.map((order) => order.supersedesId).filter((id): id is string => Boolean(id)),
    );
    const terminals = group.filter((order) => !supersededIds.has(order.id));
    const current = latestOf(terminals.length > 0 ? terminals : group);
    const history = group
      .filter((order) => order.id !== current.id)
      .sort((a, b) => a.version - b.version);

    entries.push({ order: current, history });
  }

  return entries.sort(
    (a, b) => new Date(b.order.issuedAt).getTime() - new Date(a.order.issuedAt).getTime(),
  );
}
