- Orders: the patient order list and detail now show item-level fulfilment
  progress from docforum-core's
  `GET /pharmacy-orders/orders/:orderId/fulfillment-status?orderType=`
  endpoint — a status badge plus "2 of 3 items dispensed" (never colour-only).
  A partially filled order links to the existing remaining-items facility
  picker so the rest can be collected elsewhere. Progress refreshes on focus,
  every 30 seconds, and after routing remaining items; superseded order
  versions never show progress, only the current version does.
