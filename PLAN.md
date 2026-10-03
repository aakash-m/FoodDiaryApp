# Daily Food Diary — Spec & Implementation Plan

## Context
Patients log their meals, water and exercise every day, then share a professional weekly Word report with their dietitian. The repo is a fresh **Expo SDK 57** template (expo-router ~57, RN 0.86.3, React 19.2, TS 6, npm, routes in `src/app/`, typedRoutes + React Compiler on). There is no app code yet. This document is the agreed spec plus the phased implementation plan.

## 1. Product & scope
- **Users:** individual patients (a few, via sideloaded APK). The **reader** of the .docx is their dietitian, so the document must look clean and print well.
- **Platform:** **Android only** (development build or EAS APK; Expo Go is not targeted).
- **Design:** sage palette and tokens in `src/theme/tokens.ts`, **Roboto** font (chosen over Google Sans to match the mockups), icons from `@expo/vector-icons`.
- **Language:** English, dates **dd.MM.yyyy**, strings kept in one module (ready for i18n).
- **In scope (v1):** daily log, photos, .docx report (≤7 days), in-app report preview, open/save/share, water reminder, end-of-day reminder, 7-day auto-backup (ZIP) plus restore, export of everything as PDF, onboarding, settings.
- **Out of scope (v1):** accounts and cloud sync, iOS, web, multiple entries per meal slot, future-dated logs, Play Store release, other languages, structured nutrition data (calories etc.).

## 2. Core flows
1. **Onboarding (first launch):** enter name → allow notifications (POST_NOTIFICATIONS, exact alarms) → pick the backup folder (SAF) → Home. Both reminders are ON by default.
2. **Navigation:** 4 bottom tabs: Home (Home Feed, see `design/Home_Feed_screen.jpg`), Progress, Mealtimes, Settings. Home's "Add food" opens the Day view.
   **Mealtimes tab = Day view:** today by default. A date strip with prev/next and a calendar picker for **any past day** (no future days). It shows 9 cards: 7 meals, Water, Exercise, plus a "**n/9 done**" indicator.
3. **Meal editor:** description (multi-line), up to **5 photos** (camera or gallery), **Skip** toggle. Skipping clears the description and photos (with a confirmation if they exist) and allows an optional **reason**.
4. **Water / Exercise:** free-text fields.
5. **Report:** pick a start date; the end date defaults to start+6 and can be shortened (max 7 days) → **in-app preview** → generate .docx → **Open** (external app via intent), **Save** (to the backup folder or a user-chosen folder), **Share** (share sheet).
6. **Settings:** name; water reminder on/off with window start/end (default 08:00–22:00, every 2h); end-of-day reminder on/off with time (default 22:30); backup folder, last backup time, "Back up now", "Restore", "Export all as PDF".

## 3. Data model (SQLite, single source of truth)
- **day_log**: `date` (PK, `YYYY-MM-DD`), `water_text`, `exercise_text`, `updated_at`
- **meal_entry**: `id` (UUID), `date` (FK), `meal_type` (enum, 7 values), `status` (`empty|logged|skipped`, derived on save), `description`, `skip_reason`, `updated_at`. UNIQUE(`date`, `meal_type`)
- **photo**: `id` (UUID), `meal_entry_id` (FK, cascade), `file_name` (app-private dir), `sort_order`, `created_at`. Max 5 per meal (enforced in app logic)
- **settings** (key/value): user_name, reminder toggles and times, backup_dir_uri, last_backup_at, onboarding_done
- **Meal types:** constant table (key, label, time window): Early morning 07:00–07:30, Breakfast 08:30–09:00, Mid morning 11:00–11:30, Lunch 13:00–14:00, Snacks 16:00–17:00, Dinner 19:30–20:00, Bed time 22:00.
- **Rules:** a meal is *complete* if it is skipped, or has a non-blank description, or has at least 1 photo. A day is complete when all 7 meals are complete AND water and exercise are both non-blank. Photos are resized to about 1600px on save and embedded in the .docx at about 800px JPEG.
- UUIDs and `updated_at` are kept so that cloud sync can be added later.

## 4. Architecture
- Client only, no server. Business logic in pure TS modules (`src/lib/…`) so it can be unit tested. UI lives in `src/app/` (routes) and `src/components/`.
- **Candidate modules (versions to confirm via `npx expo install`):** `expo-sqlite`, `expo-notifications`, `expo-image-picker`, `expo-image-manipulator`, `expo-file-system` (new File/Directory API, plus `legacy` StorageAccessFramework for the folder picker), `expo-sharing`, `expo-intent-launcher` (open .docx), `expo-print` (HTML→PDF export), `docx` (JS .docx builder), `fflate` or `jszip` (ZIP), a date picker (prefer `@expo/ui`, already installed).
- **Report:** a single builder turns DB rows into a `ReportModel`. That one model renders both the in-app preview and the .docx (and the "export all" PDF via HTML), so the three outputs always match.

## 5. Notifications & async (no server, local notifications only)
- **Water:** one DAILY trigger per slot in the window (08, 10, …, 22). Rebuilt whenever settings change.
- **End-of-day:** a daily repeating trigger can't carry dynamic content, so the app schedules **one-off DATE triggers**: today's carries the current list of missing items, and the next ~7 days are pre-scheduled with "nothing logged yet". It reschedules on every save, on app open and on settings changes. If today is complete, today's notification is cancelled. This works even if the app is never reopened.
- **Backup:** runs on app open if `last_backup_at` is at least 7 days ago (ZIP containing data.json and photos/, written to the SAF folder, all files **kept**). Every successful backup schedules a one-off "backup overdue" notification at +7 days. If the folder is lost or its permission revoked, the app shows a banner and asks to re-pick the folder.
- **Restore:** pick a ZIP → validate (schema version) → automatic safety backup → **replace all** → reschedule reminders.

## ASSUMPTIONS (not explicitly confirmed)
1. Single user per device. No PIN or app lock.
2. Days with no data within the report range still appear, marked "Not logged".
3. The .docx layout is one section per day: a heading "Mon, 05.10.2026", a meal table (type + time window | description / "Skipped — reason" | photos), then Water and Exercise rows. Portrait A4.
4. The header reads "Food Diary — <Name> — dd.MM.yyyy to dd.MM.yyyy — Week 40" (or "Weeks 40–41"), using ISO 8601 weeks.
5. Photos are copied into app-private storage, so deleting them from the gallery doesn't break entries.
6. Backup ZIP names look like `fooddiary-backup-YYYYMMDD-HHmm.zip`, and manual and automatic backups are named the same way.
7. "Export all as PDF" covers the full history, grouped by ISO week.
8. Notification copy example: "Missing today: Lunch, Snacks, Exercise".
9. Exact alarms are used freely (no Play Store policy applies to a sideloaded APK).
10. Tests: Jest (jest-expo) for completeness rules, ISO week labels, ReportModel/docx builder, reminder schedule computation, and backup serialise/restore. Plus a manual Android device checklist. Lint and tsc must pass.

## OPEN RISKS / unknowns
- **SAF folder access in SDK 57:** the new `expo-file-system` API documents no directory picker. The legacy `StorageAccessFramework.requestDirectoryPermissionsAsync` exists. Need to confirm that permission persists across restarts and that large binary writes are fast enough (they may go through base64).
- **"Keep all" backups:** each ZIP is a full snapshot with photos, so the folder could reach GBs after months. The user must manage it (show total size in Settings).
- **ZIP/docx memory on low-end phones:** a 7-day report holds up to 245 photos. Mitigate with resizing and streaming/chunked building, and measure on a real device.
- **`docx` library in Hermes/RN:** needs `Packer.toBase64String` (no Node Buffer/streams). Verify early with a spike.
- **Android OEM battery killers** (Xiaomi, Samsung, etc.) can delay or drop alarms. Consider a "disable battery optimisation" hint.
- **Pre-scheduled end-of-day notifications go stale** if the app isn't opened for 7 or more days (content falls back to the generic text). That's acceptable.
- **Opening the .docx needs an installed viewer** (Word, Docs, WPS). Fall back to a Share prompt.
- **Exact-alarm permission on Android 14+** isn't granted by default for new installs and needs a settings deep link. Without it, reminders fall back to inexact.

## UI (built with mock data, approved 03.10.2026)
Screens follow `design/app_design_ref.jpg` + `design/design_system_ref.jpg`, mapped to this spec (no nutrition tracking, single description per meal, 4 tabs kept):
- Onboarding 1–3 → `src/app/onboarding.tsx` (name, notifications, backup folder)
- Daily goals → Progress tab (today n/9 ring, week progress, link to report)
- Calendar → Mealtimes tab (month grid with completion dots + the day's 9 items + FAB)
- Meal Editor 1 → `src/app/meal/[date]/[type].tsx`; Water/Exercise → `src/app/day/[date]/[field].tsx`
- Meal Editor 2 → report range picker `src/app/report/index.tsx`; Weekly Report → `src/app/report/preview.tsx`
- Settings main/sub-menus → Settings tab, `src/app/settings/{reminders,backup,profile}.tsx`
- Lock Screen mockup: not applicable (system screen)

Mock data lives in `src/mocks/` and in-memory state in `src/state/session.ts`; Phases 1–6 replace them with SQLite, real pickers, notifications, docx and backup. Shared UI kit: `src/components/ui/`.

## Implementation phases (step by step, each ends with lint + tsc + tests green and a commit)
**Phase 0 – De-risking spikes (throwaway branch):** (a) `docx` → `Packer.toBase64String` under Hermes with 1 embedded JPEG, opened in Word/Docs; (b) SAF folder pick → write a 20 MB binary → restart the app → write again (confirms persistence); (c) zip/unzip of photos with fflate; (d) a DATE-trigger notification at an exact time. Results decide the final library choices.

**Phase 1 – Foundation:** `npx expo install` the modules; dev-client setup and `eas.json` (development + preview APK profiles); `app.json` Android permissions (camera, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM). `src/lib/db` (expo-sqlite schema, migrations with `PRAGMA user_version`, repositories). `src/lib/meals.ts` (meal-type constants), `src/lib/dates.ts` (dd.MM.yyyy, ISO week + "Weeks 40–41" label), `src/lib/completeness.ts`, `src/strings.ts`. Jest (jest-expo) setup with tests for dates and completeness.

**Phase 2 – Onboarding & settings:** settings repository and hook; `src/app/onboarding/*` (name → notifications → backup folder); gate in the root `_layout.tsx`; `src/app/settings.tsx`.

**Phase 3 – Daily logging:** wire the Home Feed (`src/app/(tabs)/index.tsx`, currently mock data from `src/mocks/homeFeed.ts`) to the database; `src/app/(tabs)/mealtimes.tsx` Day view (date strip, calendar picker, 9 cards, n/9 indicator); `src/app/day/[date]/meal/[type].tsx` meal editor (description, skip + reason, photo grid ≤5); water/exercise editors; `src/lib/photos.ts` (pick or capture → resize to 1600px → copy to app storage → delete with entry).

**Phase 4 – Report:** `src/lib/report/model.ts` (DB → ReportModel, includes "Not logged" days); `src/app/report/index.tsx` (range picker, max 7 days) and `preview.tsx`; `src/lib/report/docx.ts` (header, per-day tables, 800px images); open via intent-launcher (content URI), save to folder, share via expo-sharing. Tests for the model and the docx builder (structure).

**Phase 5 – Reminders:** `src/lib/notifications/schedule.ts` (pure function: settings + today's state → list of triggers, unit tested) and `apply.ts` (cancel/reschedule via expo-notifications, channels). Hooks into save, app foreground and settings changes. Exact-alarm permission check with a settings deep link.

**Phase 6 – Backup / restore / PDF:** `src/lib/backup/*` (serialise to data.json with schemaVersion + photos → ZIP → SAF folder; auto-run on open if ≥7 days; +7d overdue notification; restore with validation, safety backup and replace-all); "Export all as PDF" via expo-print from the shared ReportModel HTML; Settings shows last backup time and folder size. Round-trip tests.

**Phase 7 – Polish & release:** empty/error states, accessibility labels, battery-optimisation hint, `npx expo-doctor`, preview APK build via EAS, full device checklist.

## Verification (for the implementation phase)
`npx expo lint`, `npx tsc --noEmit`, `npx jest`. Then build a development APK (`npx eas-cli@latest build -p android --profile development`) and run the device checklist: onboarding, log/skip/photos, report preview → docx opens in Word/Docs with images, share to WhatsApp/email, water reminders fire at the right hours, end-of-day lists the correct missing items, backup runs after 7 days (simulated by changing the clock), restore on a clean install.
