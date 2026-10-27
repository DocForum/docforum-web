Phase W4: partial fulfilment — dispense some items and route the rest elsewhere
([issue #54](https://github.com/DocForum/docforum-web/issues/54)).
The facility queue now carries item-level quantities (prescribed / dispensed /
outstanding) and can dispense or reject a single item instead of a whole order;
order-level `partially_fulfilled` is derived from the item rows. Patients get
an order list and detail page under `/patient/orders`, an "Get remaining items
elsewhere" flow that routes only the outstanding items to a second facility
via an eligible-facility picker, and a payment callout that renders
`docforum-core`'s release rule verbatim — no client-side release amount is
computed. Items dispensed elsewhere are blocked and disabled, and a 409 from
`docforum-core` is surfaced as "another facility dispensed this first".

**Assumed contract.** The item-level fulfilment endpoints, the eligible-facility
list and the payment-release rule are assumed pending `docforum-core`#73; the
shapes are recorded in `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".

The partial-fulfilment item row is modelled as `OrderItemFulfillment` in
`src/types/models.ts`, not `OrderItem` — `OrderItem` is `main`'s plain order
line item (`name` / `note`), a different concept, and the two would otherwise
collide in the same module.
