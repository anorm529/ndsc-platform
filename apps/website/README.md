# NDSC Website

Next.js, TypeScript, Tailwind CSS, Vercel, Sanity and Neon/Postgres power the public North Down Softball Club site and members platform.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Required for member auth and live club data:

```bash
DATABASE_URL="postgres://..."
RESEND_API_KEY="..."
PASSWORD_RESET_FROM_EMAIL="NDSC Members <noreply@example.com>"
SITE_URL="https://example.com"
```

Optional existing variables:

```bash
MEMBERS_PIN="legacy-only"
STUDIO_PASSWORD="..."
BLOB_READ_WRITE_TOKEN="..."
CLUB_DATA_BLOB_PATHNAME="ndsc/club-data/latest.json"
```

`MEMBERS_PIN` is now legacy. The members area uses account sessions via `users` and `user_sessions`.

## Members Platform Architecture

Authentication data and player data are intentionally separate:

- `public.users` is the source of truth for login, role, account status and linked player.
- `public.players` remains the source of truth for player identity and softball data.
- `public.user_sessions` stores hashed session tokens for secure, multi-device sign-in tracking.

Every member request loads the authenticated user, reads `users.player_id`, and then personalises the page from the linked player record plus the existing club dataset.

Roles are:

- `player`
- `admin`
- `owner`

The first rebuild pass includes login, registration, logout, server-protected member routes, auto player creation, player-to-account linking, personalised dashboard, My Team routing, league standings, This Week, achievements, awards, career totals, personal records and season comparison visuals.

New member registrations are created as `pending`. A separate admin portal should approve users by setting `users.account_status = 'active'`.

## Neon Migration

Apply:

```bash
db/migrations/20260615_members_auth.sql
db/migrations/20260615_members_account_security.sql
db/migrations/20260615_player_profiles_member_since_default.sql
```

These create:

- `public.user_role`
- `public.user_account_status`
- `public.users`
- `public.user_sessions`
- `public.password_reset_tokens`
- `public.player_profiles`
- indexes for user/player/session lookups
- `updated_at` triggers for `users` and `player_profiles`
- `users.account_status` default of `pending`
- `player_profiles.member_since` default of `2014`

The migration assumes the existing `public.players.id` column is `uuid`, which matches the current application queries. Registration links to an existing player by exact case-insensitive `players.display_name`; if none exists, it inserts a new `players.display_name` record and links the new account to it.

Live schema audit on 2026-06-15 confirmed:

- `public.players.id` is `uuid` with `gen_random_uuid()`.
- `public.players.display_name` is required.
- `public.players.normalized_name` is generated as `lower(trim(display_name))` and has a unique index.
- `public.players.gender` defaults to `Unknown`.
- `public.players.active` defaults to `true`.
- `public.users` and `public.user_sessions` do not exist yet.
- The auth migration dry run completed successfully inside a rolled-back transaction.
- A player auto-create insert completed successfully inside a rolled-back transaction.
- `20260615_members_account_security.sql` was applied to Neon after a successful dry run.

## Account Security

Implemented member account tools:

- pending and disabled login messaging
- change password
- forgot/reset password token storage
- logout other sessions
- account overview with active sessions

The reset flow creates secure one-hour tokens in `password_reset_tokens` and sends reset links through Resend when `RESEND_API_KEY` and `PASSWORD_RESET_FROM_EMAIL` are configured. Set `SITE_URL` or `NEXT_PUBLIC_SITE_URL` so email links use the live site domain.

## Player Profiles

`player_profiles` stores member metadata that should not live in auth:

- position
- bats
- throws
- profile image URL
- membership status
- member since

The member dashboard reads these fields when present and falls back to stats-derived values otherwise.

## Achievements

Achievements are config-driven in `app/members/lib/achievementDefinitions.ts`. Add or tune achievements there without changing dashboard components.

## Verification

Current verification:

```bash
npx tsc --noEmit
npx eslint app/members/page.tsx app/members/login-form.tsx app/members/register/page.tsx app/members/register/register-form.tsx app/members/home/page.tsx app/members/my-team/page.tsx app/members/league-standings/page.tsx app/members/this-week/page.tsx app/members/achievements/page.tsx app/members/awards/page.tsx app/members/components/LogoutButton.tsx app/members/components/MembersNav.tsx app/members/lib/memberProfile.ts app/api/members/auth/login/route.ts app/api/members/auth/register/route.ts app/api/members/auth/logout/route.ts lib/auth.ts proxy.ts
npx next build
```

`npm run lint` still reports pre-existing lint debt in older components such as `TeamAnalytics`, `TeamCharts`, `TeamForm`, `LeagueStandingsSection`, `FacebookSection`, Sanity image helpers and the public standings client.
