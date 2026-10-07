# Landing page and auth polish

- [x] Remove the fifth landing-page section (the STAR bullet diff explorer).
- [x] Use the authenticated Clerk profile image and name in the user menu.
- [x] Refine the Clerk sign-in dialog and remove its branding footer.
- [x] Send successful sign-ins and sign-ups to the dashboard; Clerk hash routing handles OAuth callbacks.
- [x] Keep Clerk session exchange connected to the application backend.
- [x] Replace the gradient emphasis on “next opportunity” and “Interview Readiness” with solid brand blue.
- [x] Improve the footer with clear section links and a glass contact card.
- [x] Preserve the existing glass surfaces and Lenis smooth scrolling with reduced-motion support.
- [x] Keep the existing ambient background; it already has gradient blooms, a blueprint grid, and a reduced-motion-aware pointer light.
- [x] Keep a clear primary landing-page action and simplify the content path by removing the requested section.
- [x] Add Lenis smooth scrolling with reduced-motion support and a lower-motion mode.
- [x] Add three optimized profile portraits and expand the landing page with a career growth section.
- [x] Restore the dashboard directly when a returning user has a valid backend session.
- [x] Retry Clerk-to-backend session exchange and prevent auth responses from being cached.
- [x] Add a shared database-backed IP burst limiter for serverless instances.
- [x] Track admin-confirmed payment receipts separately from Pro access and activate Pro only when verified totals reach the price.

## Deployment note

The TypeScript check passes. Vite creates the production client bundle, but the full
build stops while generating security headers because `VITE_CLERK_PUBLISHABLE_KEY`
is not configured in this workspace. The production deploy also needs a stable
32-character `SESSION_SECRET`, `STORAGE_ENCRYPTION_KEY`, the other server-only
environment settings, and the two new Supabase migrations applied. The live
Netlify site currently returns 404 for `/api/health`, `/api/auth/me`, and
`/.netlify/functions/api/health`; redeploy the correct repository/branch and
Netlify function configuration after those requirements are met.

Disposable live probes confirmed Supabase database insert/update/select/delete
and private Storage upload/download/delete work. The disposable rows and objects
were removed after verification.
