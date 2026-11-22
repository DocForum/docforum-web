Phase W2: patient orders now have exactly one list and one detail screen
([issue #222](https://github.com/DocForum/docforum-web/issues/222)). The
duplicate `PatientOrdersPage`/`PatientOrderDetailPage` pair and the extra
top-level `/patient/orders/:orderId` route were removed, so route ranking can
no longer decide which copy a patient sees. The surviving `OrdersList` gained
the item-count/outstanding summary, fulfilment badge and expiry from the
deleted list; the surviving `OrderDetailPage` now composes the QR, print and
confirm-receipt card with a new `OrderFulfillment` section covering item
quantities, the payment rule and partial-fulfilment routing. Acting-for
scoping, notification deep links and the existing `/patient/orders` URLs are
unchanged, and the coverage from the deleted tests moved to the kept
components.
