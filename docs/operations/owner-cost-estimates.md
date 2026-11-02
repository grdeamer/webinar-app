# Owner cost estimates

The dashboard and `/api/admin/costs` require the exact confirmed owner email plus an active administrator role. Provider snapshots are server-only tables with RLS and no anon/authenticated grants. No media services are started by a cost refresh.

Production server configuration:
- `COSTS_VERCEL_BILLING_TOKEN`: private integration token, Billing Read and installation metadata only.
- `COSTS_VERCEL_TEAM_ID`: explicitly selected team; billing is team-wide.
- `COSTS_SUPABASE_READ_TOKEN`: organization-scoped metadata read token, no SQL, API secrets or writes. Current token expires January 31, 2027; renew before expiration.
- `COSTS_SUPABASE_ORG_SLUG`: explicitly selected organization.
- `CRON_SECRET`: Vercel-authenticated daily request at 13:15 UTC.

Refreshes use database compare-and-set daily reservations. Failed requests retain the last successful snapshot. AWS Cost Explorer remains limited to one paid attempt per UTC day, including failures; repeated panel refreshes cannot bypass this. Vercel and Supabase connections use their public APIs, not browser sessions.

Vercel FOCUS records include prorated subscriptions, so the estimate does not add another Pro base. Projection uses the actual returned billing-period coverage and the current month's day count. Build activity, credits and posting delay can substantially distort short-window projections.

Supabase estimates use the current Free/Pro plan, selected compute, discovered branches and fixed add-ons. The organization compute credit is applied once. Hourly prices use the actual calendar month's hours. This is current configuration run-rate, not invoice-to-date. Deleted branches, historical resizing, usage-priced add-ons and metered overages are not reconstructed. Unsupported or incomplete price inventories fail closed.

AWS posted spend is projected once, with the known retained disk/IP estimate as a floor. Standby and current-boot compute are not added again to posted AWS charges. Future event hours and traffic can increase the estimate. Other unconfirmed subscriptions remain excluded and clearly flagged, not assigned zero.

Official references:
- https://vercel.com/docs/rest-api/billing/list-focus-billing-charges
- https://vercel.com/docs/integrations/create-integration/vercel-api-integrations
- https://supabase.com/docs/reference/api/introduction
- https://supabase.com/docs/guides/platform/personal-access-tokens
