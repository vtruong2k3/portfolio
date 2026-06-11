# Implementation Plan: dev-portfolio-3d

## Overview

This plan converts the design into incremental, test-driven coding tasks organized by the phased MVP plan (P1–P6). The system is built as **two independent projects living side by side at the repository root** — there is no monorepo, no pnpm workspace, and no shared packages:

- **`portfolio-be`** — NestJS 11 + Prisma 6 + PostgreSQL backend. Code lives under `portfolio-be/src/...`; the schema is `portfolio-be/prisma/schema.prisma`; `docker-compose.yml` and `.env`/`.env.example` live inside `portfolio-be`.
- **`portfolio-fe`** — Next.js (App Router) frontend. Server Components by default; explicit types in `types/` split per domain (no `any`); a single axios instance in `lib/axios.ts`; per-domain `services/*.service.ts`; React Query hooks in `hooks/queries` + `hooks/mutations`; Zustand stores in `store/`; components split per section under `components/sections` plus `components/ui`, `components/three`, `components/admin`, `components/providers`.

Anything that would otherwise be shared (entity types, the `contact` Zod schema, slug helpers) is **duplicated independently in each project** and kept in agreement by convention and the REST contract.

Each task builds on the previous one and ends with wiring components together, so there is no orphaned code. Property-based tests use `fast-check` (minimum 100 runs, `fc.assert(..., { numRuns: 100 })`) and carry the traceability tag `// Feature: dev-portfolio-3d, Property N: ...`. Example/unit, integration (supertest + test DB), `axe-core` accessibility, and smoke tests complement the property tests per the design's Testing Strategy. There is one property-based test per correctness property (26 total).

Completed work is checked `[x]`; partially-completed tasks are left unchecked with a note describing what remains.

## Tasks

### Phase 1 (P1): Project setup, Prisma schema, public read APIs

- [ ] 1. Set up the two independent projects, dependencies, and local dev infrastructure
  - [x] 1.1 Install and configure backend (`portfolio-be`) dependencies
    - Install prisma 6, zod, nestjs-zod, @nestjs/config, @nestjs/jwt, passport-jwt, bcrypt, @nestjs/throttler, @nestjs/swagger, nodemailer, and fast-check; confirm `npm run build` passes
    - _Requirements: 1.2, 1.7_
    - _Done: all dependencies installed in `portfolio-be`; build passes._

  - [x] 1.2 Install and configure frontend (`portfolio-fe`) dependencies
    - Install three/@react-three/fiber/drei, gsap, lenis, next-intl, react-hook-form, @hookform/resolvers, zod, framer-motion, sonner, axios, @tanstack/react-query, zustand, and the test toolchain (vitest + @testing-library + fast-check + vitest-axe)
    - _Requirements: 1.1, 1.7_
    - _Done: all dependencies installed in `portfolio-fe`._

  - [x] 1.3 Add backend local dev infrastructure and env contract
    - Create `portfolio-be/docker-compose.yml` with a PostgreSQL service for development; create `portfolio-be/.env` and `portfolio-be/.env.example` documenting all backend variables (DATABASE_URL, JWT_*, ADMIN_*, SMTP_*, UPLOAD_DIR, WEB_ORIGIN, CONTACT_RATE_*, PORT)
    - _Requirements: 1.6, 18.5_
    - _Done: `portfolio-be/docker-compose.yml`, `.env`, `.env.example` present._

  - [ ] 1.4 Establish the duplicated contract conventions in both projects
    - Frontend: explicit types split per domain in `portfolio-fe/types` (`project.ts`, `skill.ts`, `experience.ts`, `blog.ts`, `contact.ts`, `api.ts`, `index.ts` barrel) and the `contact` Zod schema in `portfolio-fe/lib/schemas/contact.schema.ts`
    - Backend: independent Zod schemas + `nestjs-zod` DTOs colocated with modules, and an independent `generateSlug(title)` / collision-resolution utility in `portfolio-be/src`
    - _Requirements: 2.9, 2.10_
    - _Partial: frontend `types/` + `lib/schemas/contact.schema.ts` done; backend Zod schemas/DTOs and slug utility pending (added alongside the mutation endpoints)._

  - [ ] 1.5 Write smoke/configuration checks for the two-project structure
    - Verify both projects exist as siblings, the `portfolio-be/docker-compose.yml` Postgres service is defined, and each project exposes its own test command
    - _Requirements: 1.1, 1.2, 1.6, 26.3, 26.4_

- [ ] 2. Define the database schema and Prisma access (`portfolio-be`)
  - [x] 2.1 Define the Prisma schema for all models
    - `portfolio-be/prisma/schema.prisma` with `Project`, `Skill`, `Experience`, `BlogPost`, `ContactMessage`, `SiteSetting`, `Admin`, `PageView`; `@unique` on `Project.slug`, `BlogPost.slug`, `SiteSetting.key`; ordering/index fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_
    - _Done: 8 models defined in `portfolio-be/prisma/schema.prisma` (Prisma 6)._

  - [x] 2.2 Wire Prisma access and admin bootstrap
    - Implement `PrismaService` and a global `PrismaModule`; add `portfolio-be/prisma/seed.ts` that creates exactly one `Admin` from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (bcrypt-hashed)
    - _Requirements: 14.3, 14.4_
    - _Done: `PrismaService` + global `PrismaModule` + `prisma/seed.ts` present._

  - [ ] 2.3 Run the initial Prisma migration
    - Run `prisma migrate dev` against the docker-compose Postgres so the schema is applied and tables are created
    - _Requirements: 2.12_
    - _Pending: no local Postgres/Docker available yet._

  - [ ] 2.4 Write migration smoke test
    - Verify `prisma migrate` applies cleanly to the test DB and the expected tables exist
    - _Requirements: 2.12_

- [ ] 3. Implement the public read API (`portfolio-be`)
  - [x] 3.1 Implement the global exception filter, error envelope, CORS, and Swagger
    - Global `AllExceptionsFilter` (`portfolio-be/src/common/filters/http-exception.filter.ts`) mapping domain errors to 400/401/404/429 with a `{ statusCode, message, error }` envelope; wire in `main.ts` with CORS restricted to `WEB_ORIGIN` and Swagger published at `/docs`
    - _Requirements: 3.4, 3.5, 17.1, 17.2_
    - _Done: filter + envelope + CORS + Swagger `/docs` wired in `main.ts`._

  - [ ] 3.2 Add the global Zod `ValidationPipe` for mutations
    - Register the `nestjs-zod` validation pipe so DTOs reject invalid payloads with HTTP 400 (consumed by the POST/PATCH endpoints in P5)
    - _Requirements: 12.8, 15.6, 16.4, 20.6_
    - _Pending: filter done; pipe added with the first mutation endpoints._

  - [x] 3.3 Implement projects public endpoints
    - `GET /projects` (order asc), `GET /projects/featured` (featured=true, order asc), `GET /projects/:slug` (200 or 404), returning JSON
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
    - _Done in `portfolio-be/src/projects`._

  - [x] 3.4 Implement skills and experiences public endpoints
    - `GET /skills` and `GET /experiences` ordered by `order` asc, returning JSON
    - _Requirements: 4.1, 4.2, 4.3_
    - _Done in `portfolio-be/src/skills` and `portfolio-be/src/experiences`._

  - [ ] 3.5 Write property test for list ordering
    - **Property 1: List endpoints are ordered by `order` ascending**
    - **Validates: Requirements 3.1, 4.1, 4.2, 11.2**

  - [ ] 3.6 Write property test for featured filtering and ordering
    - **Property 2: Featured projects are filtered and ordered**
    - **Validates: Requirements 3.2**

  - [ ] 3.7 Write property test for slug generation and retrieval
    - **Property 8: Generated slugs are unique and well-formed** (uses the backend slug utility from task 1.4)
    - **Validates: Requirements 2.9, 2.10, 3.3, 20.2**

  - [ ] 3.8 Write API e2e tests for public read endpoints
    - Happy-path and 404 paths for projects/skills/experiences via supertest against the test DB
    - _Requirements: 26.1_

- [ ] 4. Checkpoint - Ensure all P1 tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2 (P2): Layout, responsive, i18n, blog display, CV, SEO, accessibility

- [ ] 5. Build the frontend foundation (`portfolio-fe`): data layer, theming, i18n
  - [x] 5.1 Implement the axios data layer (instance, services, query hooks, stores)
    - `lib/axios.ts` single axios instance (base URL from `NEXT_PUBLIC_API_URL`) + `getApiErrorMessage`; per-domain `services/*.service.ts` (project/skill/experience/contact); React Query read hooks in `hooks/queries` (use-projects/use-skills/use-experiences) and mutation hook `hooks/mutations/use-contact`; `lib/query-keys.ts`; `store/ui.store.ts` (Zustand); `components/providers/query-provider.tsx`
    - _Requirements: 18.5_
    - _Done: axios instance, services, query/mutation hooks, query keys, ui store, and QueryProvider present._

  - [x] 5.2 Apply the dark premium design tokens
    - `portfolio-fe/app/globals.css` Tailwind v4 `@theme` tokens (dark palette `#050816`/`#080A12`, cyan/blue primary, violet/pink accent, glass surfaces, reduced-motion handling)
    - _Requirements: 5.4_
    - _Done: design tokens in `app/globals.css`._

  - [ ] 5.3 Implement i18n with next-intl (middleware, request config, switcher, persistence)
    - Add the next-intl middleware and request config, a language switcher component, and locale persistence on top of the existing pure `resolveLocale(browserTags)` and `messages/{vi,en}.json`
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
    - _Partial: `lib/i18n/config.ts` (`resolveLocale`) + `messages/{vi,en}.json` done; middleware + request config + language switcher + locale persistence pending._

  - [x] 5.4 Write property test for locale resolution
    - **Property 3: Locale resolution always yields a supported locale**
    - **Validates: Requirements 19.5**
    - _Done: passing test at `portfolio-fe/lib/i18n/config.test.ts`._

- [ ] 6. Implement layout, sections, and responsive behavior (`portfolio-fe`)
  - [ ] 6.1 Build the root layout, navbar, and section scaffold
    - Localized `app/[locale]/layout.tsx` with landmarks and providers; navbar linking Hero/About/Skills/Projects/Experience/Contact with in-page scroll; render the per-section components under `components/sections` in order with mock data for Skills/Projects/Experience; About uses a glass card + timeline
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 6.2 Implement responsive layout and navigation
    - Mobile layout/navigation below 768px, wide layout at/above 768px, no horizontal overflow at supported breakpoints
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 6.3 Write example tests for navbar, sections, and responsive variants
    - Navbar links and section landmarks render; responsive nav variants at representative widths
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

- [ ] 7. Implement SEO, CV download, and public blog display
  - [ ] 7.1 Implement SEO metadata helpers and files (`portfolio-fe`)
    - `lib/seo.ts` `generateMetadata` producing title/description/Open Graph/Twitter tags per public page; add `app/sitemap.ts` and `app/robots.ts`
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

  - [ ] 7.2 Write property test for page metadata
    - **Property 22: Page metadata reflects the record**
    - **Validates: Requirements 24.1, 24.2, 24.5**

  - [ ] 7.3 Implement public settings endpoint and CV download
    - Backend `GET /settings/:key` (200/404) in `portfolio-be/src/settings`; frontend CV download button/link reading the configured path from `Site_Setting`/env (never hard-coded)
    - _Requirements: 21.1, 21.2, 21.3_

  - [ ] 7.4 Implement public blog endpoints and pages
    - Backend `GET /posts` (published only, publishedAt desc) and `GET /posts/:slug` (published only, else 404) in `portfolio-be/src/blog`; `app/blog/page.tsx` list and `app/blog/[slug]/page.tsx` detail pages in `portfolio-fe`
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [ ] 7.5 Write property test for blog list filtering and ordering
    - **Property 7: Blog list returns only published posts in publishedAt-descending order**
    - **Validates: Requirements 20.1**

- [ ] 8. Implement accessibility foundations (`portfolio-fe`)
  - [ ] 8.1 Apply accessibility attributes across content
    - Non-empty `alt` on content images, keyboard-operable interactive elements, visible focus indicators, landmarks and ARIA attributes for structure/dynamic components
    - _Requirements: 25.1, 25.2, 25.4, 25.5_

  - [ ] 8.2 Write property test for content image alt text
    - **Property 23: Content images always have alt text**
    - **Validates: Requirements 25.1**

  - [ ] 8.3 Write property test for body-text contrast tokens
    - **Property 24: Body text color pairs meet WCAG AA contrast**
    - **Validates: Requirements 25.3**

  - [ ] 8.4 Write accessibility tests with axe-core
    - Run `vitest-axe` against key rendered sections for keyboard/landmark/ARIA issues
    - _Requirements: 25.2, 25.4, 25.5_

- [ ] 9. Checkpoint - Ensure all P2 tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3 (P3): Cursor/magnetic interactions, smooth scroll/reveal, contact form

- [ ] 10. Implement motion and interaction primitives (`portfolio-fe`)
  - [ ] 10.1 Implement reduced-motion gating
    - Add a `useReducedMotion` hook and a `MotionConfig` provider (under `components/providers`) so non-essential motion is disabled/minimized when `prefers-reduced-motion` is set, and preserved otherwise
    - _Requirements: 8.4, 25.6_

  - [ ] 10.2 Write property test for reduced-motion resolution
    - **Property 18: Reduced motion disables non-essential animation**
    - **Validates: Requirements 8.4, 25.6**

  - [ ] 10.3 Implement smooth scroll, reveal, and page transitions
    - Lenis smooth scroll provider, `useReveal` (GSAP ScrollTrigger) for section reveals, and fade/blur/y page transitions, all gated by reduced-motion
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 10.4 Implement cursor glow driven by CSS variables
    - `useCursorGlow` (+ a `CursorGlow` provider) updates radial-glow CSS variables from pointer coordinates on pointer devices
    - _Requirements: 7.1_

  - [ ] 10.5 Write property test for cursor glow tracking
    - **Property 20: Cursor glow position tracks pointer coordinates**
    - **Validates: Requirements 7.1**

  - [ ] 10.6 Implement card hover glow and magnetic buttons
    - Card radial glow (`components/ui`) on pointer enter, hidden on leave; `useMagnetic` translates a button toward the pointer within a bounded maximum displacement
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ] 10.7 Write property test for bounded magnetic displacement
    - **Property 19: Magnetic button displacement is bounded**
    - **Validates: Requirements 7.4**

  - [ ] 10.8 Write example tests for hover glow and reveal wiring
    - Card hover-glow enter/leave behavior and scroll-reveal trigger wiring
    - _Requirements: 7.2, 7.3, 8.1, 8.2, 8.3_

- [ ] 11. Implement the contact form (`portfolio-fe`)
  - [ ] 11.1 Build the contact form and social links
    - `components/sections` Contact form (name/email/message) with social links, React Hook Form + the `contact.schema.ts` Zod resolver, inline accessible validation messages that block submission, submit via `hooks/mutations/use-contact` → `contactService` → POST `/contact`, and success/error toasts (sonner)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.9_

  - [ ] 11.2 Write example tests for contact validation and toasts
    - Inline validation blocks invalid/blank submissions; success and error (fetch-failure) toasts render
    - _Requirements: 12.4, 12.5, 12.9, 10.4_

- [ ] 12. Checkpoint - Ensure all P3 tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4 (P4): 3D Hero/scenes, projects and experience from API

- [ ] 13. Implement the 3D Hero scene and visual elements (`portfolio-fe/components/three`)
  - [ ] 13.1 Build the Hero scene
    - `HeroScene` via dynamic import with `ssr: false`, containing a 3D model (compressed glTF from `public/models`), 3D text, and CTA buttons; wrap in an error boundary + Suspense fallback for WebGL/model failures
    - _Requirements: 9.1, 9.2, 9.7_

  - [ ] 13.2 Implement responsive particle background
    - `Particles` background whose count is computed from viewport width and reduced below 768px (non-negative integer)
    - _Requirements: 9.3, 9.6_

  - [ ] 13.3 Write property test for particle count
    - **Property 4: Particle count is reduced on narrow viewports**
    - **Validates: Requirements 9.6**

  - [ ] 13.4 Implement 3D skills and projects presentation
    - `SkillsCloud` (3D orbit/tilt) for the Skills section and `ProjectCarousel` (horizontal scroll / 3D carousel) for the Projects section
    - _Requirements: 9.4, 9.5_

- [ ] 14. Wire projects and experience to the Public API (`portfolio-fe`)
  - [ ] 14.1 Implement the projects section from API data
    - Fetch projects via `hooks/queries/use-projects`; render image, techStack, description, GitHub and demo links opening in a new tab; hover glow on cards; explicit error state on fetch failure
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 14.2 Write property test for project card rendering
    - **Property 21: Project card renders all required fields**
    - **Validates: Requirements 10.2, 10.5**

  - [ ] 14.3 Implement the experience timeline from API data
    - Fetch experiences via `hooks/queries/use-experiences` and render a vertical timeline ordered by `order`, with scroll-reveal per item
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 14.4 Write example tests for experience timeline and error states
    - Timeline renders ordered items; projects section renders error state on fetch failure
    - _Requirements: 10.4, 11.2, 11.3_

- [ ] 15. Checkpoint - Ensure all P4 tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 5 (P5): Contact backend, throttling, auth, admin CRUD, upload, swagger, analytics, dashboard

- [ ] 16. Implement the contact backend and rate limiting (`portfolio-be/src/contact`)
  - [ ] 16.1 Implement the contact endpoint and SMTP notification
    - `POST /contact` validates via the backend `contact` Zod DTO (400 on invalid), persists `ContactMessage` with `isRead=false`, then fires an SMTP notification (nodemailer) to the configured address (failure logged, does not roll back), returning 201
    - _Requirements: 12.6, 12.7, 12.8_

  - [ ] 16.2 Apply the throttler to the contact endpoint
    - Rate-limit POST `/contact` per IP within the configured window (`CONTACT_RATE_*`), returning 429 when exceeded
    - _Requirements: 13.1, 13.2_

  - [ ] 16.3 Write property test for contact validation soundness
    - **Property 5: Contact submission validation is sound**
    - **Validates: Requirements 12.4, 12.5, 12.6, 12.8**

  - [ ] 16.4 Write property test for rate limiting
    - **Property 6: Contact endpoint enforces the rate limit**
    - **Validates: Requirements 13.1, 13.2**

  - [ ] 16.5 Write example test for SMTP notification dispatch
    - Verify the SMTP send is invoked (mock-based) on a valid contact submission
    - _Requirements: 12.7_

- [ ] 17. Implement admin authentication (`portfolio-be/src/auth`)
  - [ ] 17.1 Implement login and JWT guard
    - `POST /admin/login` verifies credentials against the single Admin (bcrypt) and returns a JWT (401 otherwise); `JwtAuthGuard` protects every `/admin/*` route except login
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ] 17.2 Write property test for password hashing
    - **Property 12: Password hashing round-trips**
    - **Validates: Requirements 14.3**

  - [ ] 17.3 Write property test for login behavior
    - **Property 13: Login succeeds iff credentials match the single admin**
    - **Validates: Requirements 14.1, 14.2, 14.4**

- [ ] 18. Implement admin CRUD APIs (`portfolio-be`)
  - [ ] 18.1 Implement admin projects CRUD
    - `GET/POST /admin/projects`, `PATCH/DELETE /admin/projects/:id` with Zod DTO validation, slug generation (task 1.4 utility), 404 on missing, 400 on invalid
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ] 18.2 Implement admin skills and experiences CRUD
    - Mirror the project CRUD shape for skills and experiences with validation and 404/400 handling
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ] 18.3 Implement admin blog CRUD
    - `GET/POST /admin/posts`, `PATCH/DELETE /admin/posts/:id` with validation, slug generation, and 404/400 handling
    - _Requirements: 20.5, 20.6_

  - [ ] 18.4 Write property test for admin CRUD round-trips
    - **Property 9: Admin CRUD round-trips preserve data**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 20.5**

  - [ ] 18.5 Write property test for non-existent resource handling
    - **Property 10: Operations on non-existent resources return 404**
    - **Validates: Requirements 3.4, 15.5, 20.3**

  - [ ] 18.6 Write property test for invalid mutation payloads
    - **Property 11: Invalid mutation payloads are rejected with 400**
    - **Validates: Requirements 15.6, 20.6**

- [ ] 19. Implement upload, contact inbox, settings, analytics, and Swagger (`portfolio-be`)
  - [ ] 19.1 Implement image upload behind a storage abstraction
    - `POST /admin/upload` (multipart) validates MIME type (400 on unsupported), stores via a `StorageService` to `UPLOAD_DIR`, serves files statically, and returns an accessible URL
    - _Requirements: 16.3, 16.4_

  - [ ] 19.2 Write property test for upload file-type validation
    - **Property 16: Image upload validates by file type**
    - **Validates: Requirements 16.3, 16.4**

  - [ ] 19.3 Implement admin contact inbox and mark-read
    - `GET /admin/contact` lists messages; `PATCH /admin/contact/:id/read` sets `isRead=true` idempotently
    - _Requirements: 16.1, 16.2_

  - [ ] 19.4 Write property test for mark-read transition
    - **Property 15: Marking a message read is a correct, idempotent transition**
    - **Validates: Requirements 16.2**

  - [ ] 19.5 Implement admin settings read/write
    - `GET/PUT /admin/settings/:key` with last-write-wins semantics (one record per key)
    - _Requirements: 2.11, 21.3_

  - [ ] 19.6 Write property test for settings last-write-wins
    - **Property 17: Site settings are keyed and last-write-wins**
    - **Validates: Requirements 2.11**

  - [ ] 19.7 Implement page-view analytics
    - `POST /analytics/view` stores a `PageView` with no PII (no IP/cookie/identifier); `GET /admin/analytics` returns aggregate totals/by-path counts
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [ ] 19.8 Write property test for page-view recording and aggregation
    - **Property 25: Page-view recording stores no PII and aggregates correctly**
    - **Validates: Requirements 22.2, 22.3, 22.4**

  - [ ] 19.9 Write Swagger smoke test
    - The `/docs` documentation path responds with a valid OpenAPI document (Swagger publishing was wired in task 3.1)
    - _Requirements: 17.1, 17.2_

- [ ] 20. Implement the Admin Dashboard (`portfolio-fe/components/admin` + `app/admin`)
  - [ ] 20.1 Implement login, token storage, route protection, and logout
    - Login page (`LoginForm`) that stores the JWT on success (attached by the axios instance), `ProtectedRoute` redirecting unauthenticated access to login, 401-driven token clear/redirect, and logout that removes the token
    - _Requirements: 23.1, 23.2, 23.3, 23.7_

  - [ ] 20.2 Write property test for the admin guard and redirect
    - **Property 14: Admin guard authorizes iff a valid token is present**
    - **Validates: Requirements 14.5, 14.6, 23.3**

  - [ ] 20.3 Write property test for the admin token lifecycle
    - **Property 26: Admin token lifecycle round-trips**
    - **Validates: Requirements 23.2, 23.7**

  - [ ] 20.4 Build entity management UIs
    - Reusable `EntityTable`/`EntityForm` (with admin mutation hooks under `hooks/mutations`) providing create/read/update/delete for Project, Skill, Experience, and Blog_Post against the Admin API
    - _Requirements: 23.4_

  - [ ] 20.5 Build contact inbox and image uploader UIs
    - `ContactInbox` listing messages with mark-as-read; `ImageUploader` posting to `/admin/upload`
    - _Requirements: 23.5, 23.6_

  - [ ] 20.6 Implement client-side page-view tracking
    - Send a page-view record to `POST /analytics/view` on public page views
    - _Requirements: 22.1_

  - [ ] 20.7 Write example tests for dashboard UIs
    - Login, CRUD tables/forms, inbox, and uploader render correctly
    - _Requirements: 23.1, 23.4, 23.5, 23.6_

- [ ] 21. Integration wiring and end-to-end coverage (`portfolio-be`)
  - [ ] 21.1 Write API e2e tests across Public and Admin APIs
    - Auth flow, one CRUD cycle per entity, contact + throttle, and upload via supertest against the test DB
    - _Requirements: 26.1, 26.2_

- [ ] 22. Checkpoint - Ensure all P5 tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 6 (P6): Deployment configuration

- [ ] 23. Add deployment and environment configuration
  - [ ] 23.1 Configure `portfolio-fe` deployment
    - Frontend build/deploy config reading `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SITE_URL` from env (no hard-coded values)
    - _Requirements: 18.1, 18.5_

  - [ ] 23.2 Configure `portfolio-be` deployment, database, and CORS
    - Backend build (`dist/`) and start config (`node dist/main`), `DATABASE_URL`-driven connection with migrations on deploy, and CORS restricted to the configured `WEB_ORIGIN`; all secrets/config from env
    - _Requirements: 18.2, 18.3, 18.5_

  - [ ] 23.3 Configure image storage provider abstraction
    - Ensure `StorageService` defaults to local disk via `UPLOAD_DIR` and can switch to a hosted provider purely by configuration without controller changes
    - _Requirements: 18.4_

- [ ] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The system is two independent projects (`portfolio-fe`, `portfolio-be`) at the repo root — no monorepo, no pnpm workspace, no shared packages. Shared contracts (types, the `contact` Zod schema, slug helpers) are duplicated in each project and kept aligned by the REST contract.
- Each project is installed and tested on its own: `portfolio-fe` uses `npm run test` (vitest run); `portfolio-be` uses `npm run test` (jest) and `npm run test:e2e` (supertest).
- Each task references specific requirements for traceability; checkpoints ensure incremental validation per phase.
- Property tests validate the 26 universal correctness properties with `fast-check` (≥100 runs) and the traceability tag `// Feature: dev-portfolio-3d, Property N: ...` — one property-based test per property.
- DB-backed property/integration tests run against a disposable PostgreSQL test database (the `portfolio-be/docker-compose.yml` service or a per-case transaction rollback).
- Example, integration (supertest), `axe-core` accessibility, and smoke tests complement the property tests per the design's Testing Strategy.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.4", "1.5", "2.3", "3.2", "5.3"] },
    { "id": 1, "tasks": ["2.4", "3.5", "3.6", "3.7", "3.8", "6.1", "10.1"] },
    { "id": 2, "tasks": ["6.2", "7.1", "7.3", "7.4", "10.2", "10.3", "10.4", "10.6"] },
    { "id": 3, "tasks": ["6.3", "7.2", "7.5", "8.1", "10.5", "10.7", "10.8", "11.1"] },
    { "id": 4, "tasks": ["8.2", "8.3", "8.4", "11.2", "13.1", "13.2", "13.4", "16.1", "16.2", "17.1"] },
    { "id": 5, "tasks": ["13.3", "14.1", "14.3", "16.3", "16.4", "16.5", "17.2", "17.3", "18.1", "18.2", "18.3", "19.1", "19.3", "19.5", "19.7", "19.9"] },
    { "id": 6, "tasks": ["14.2", "14.4", "18.4", "18.5", "18.6", "19.2", "19.4", "19.6", "19.8", "20.1"] },
    { "id": 7, "tasks": ["20.2", "20.3", "20.4", "20.5", "20.6"] },
    { "id": 8, "tasks": ["20.7", "21.1"] },
    { "id": 9, "tasks": ["23.1", "23.2", "23.3"] }
  ]
}
```
