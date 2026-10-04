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
- **Modules:** installed and verified in Phase 0: `expo-file-system` 57 (new File/Directory API incl. `Directory.pickDirectoryAsync`), `expo-notifications`, `expo-sharing`, `expo-intent-launcher` (open .docx), `expo-dev-client`, `docx` 9.8.1, `fflate` (ZIP). Still to add: `expo-sqlite`, `expo-image-picker`, `expo-image-manipulator`, `expo-print` (HTML→PDF export), a date picker (prefer `@expo/ui`, already installed).
- **Runtime:** a development build, not Expo Go (Expo Go can't load `expo-notifications` in SDK 57). EAS project `@aaki-m/FoodDiaryApp`, Android package `com.aakashmakhija.fooddiary`, profiles `development` and `preview` (APK) in `eas.json`.
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
- ~~SAF folder access in SDK 57~~ resolved in Phase 0: `Directory.pickDirectoryAsync` keeps access across restart and reboot. **New:** `FileHandle` on SAF files breaks after a GC (expo-file-system bug). Always stage in `Paths.cache` and `copy()` to/from the folder. Worth reporting upstream.
- **"Keep all" backups:** each ZIP is a full snapshot with photos, so the folder could reach GBs after months. The user must manage it (show total size in Settings).
- **ZIP/docx time and memory on low-end phones:** worst-case report was 20 s / 9.4 MB in dev mode on the emulator; a 300 MB backup took 29 s to write and 95 s to restore. Show progress UI, stream backups, and measure on a real device in release mode.
- ~~`docx` library in Hermes/RN~~ resolved in Phase 0 (works; build a fresh `Document` per pack).
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

## Phase 0 results (03.10.2026, Android 12 emulator, Expo SDK 57, dev-mode JS)
Spike code: branch `spike/phase-0`, `src/app/spike.tsx` (throwaway).

**(a) .docx under Hermes — PASS (`docx` 9.8.1)**
- `Packer.toArrayBuffer` and `Packer.toBase64String` both work; write the bytes with `File.write(Uint8Array)`, no base64 needed.
- Word on Windows opened the Hermes-built files: worst case 7 days × 7 meals × 5 photos = 245 unique JPEGs → 9.4 MB, 49 pages. Build 9 s + pack 11 s (dev mode); release is faster.
- **Rule:** create a fresh `Document` for every pack. Packing the same instance twice duplicates relationships/numbering and Word reports the file as corrupted.
- `docx` de-duplicates identical image bytes (only one copy is stored).
- Opening: `IntentLauncher.startActivityAsync(VIEW, { data: file.contentUri, flags: 1, type: docx-mime })`. Without a viewer it throws a catchable `ActivityNotFoundException` → fall back to Share. `Sharing.shareAsync` works (Gmail, Drive, Bluetooth, …).

**(b) Backup folder (SAF) — PASS**
- `Directory.pickDirectoryAsync()` (new API, undocumented on the docs page) takes a persistable URI permission. Access survived app restart **and** device reboot.
- 20 MB `File.write(Uint8Array)` into the SAF folder: 1.1 s.
- Android blocks picking the storage root and the `Download` root itself (Android 11+). Onboarding must ask the user to pick or create a subfolder (e.g. `Documents/FoodDiary`).

**(c) ZIP — PASS with a workaround**
- `fflate` `zipSync`/`unzipSync`: 50 photos in 0.2 s / 0.04 s, byte-identical. Fine for small archives only (whole archive in memory).
- Real backups (hundreds of MB) must stream: `fflate` `Zip` + `ZipPassThrough` (store, JPEGs don't compress) → `FileHandle.writeBytes`. 300 MB / 1000 photos: 29 s.
- **expo-file-system bug:** `File.open()` on a SAF `content://` file drops its `ParcelFileDescriptor`; after a GC the fd is closed and `writeBytes`/`readBytes` are rejected (~10 MB in). Workaround, verified: stream into `Paths.cache` (`file://`, RandomAccessFile-backed), then `await cacheFile.copy(safDirectory)` (300 MB in 2.6 s). Restore: `safFile.copy(cacheDir)` (2.3 s) then stream-unzip the local copy (300 MB in 95 s, dev mode). Archive verified on PC: 1001 entries, all CRCs OK.
- Needs free space ≈ backup size for the staging copy; show a clear error when low.

**(d) Exact DATE notifications — PASS (EAS development build)**
- `expo-notifications` **cannot be imported in Expo Go (SDK 57, Android)**; it throws at import. All app work from now on runs in the development build (`eas.json` profile `development`, `npx expo start --dev-client`).
- A `DATE` trigger scheduled 60 s ahead with the app in the background was posted **83 ms** after the due time (Android `when=` timestamp). `SCHEDULE_EXACT_ALARM` is declared in `app.json` and was auto-granted on Android 12.
- Phase 5 to-dos: set a monochrome notification `icon` in the `expo-notifications` plugin (the default shows a placeholder ring). On Android 13+, `POST_NOTIFICATIONS` is a runtime prompt. On Android 14+, exact alarms are not pre-granted for new installs, so check and deep-link to settings. Force-stopping the app cancels its alarms (Android behaviour).

**Not covered by Phase 0 (still open):** a real phone (OEM battery savers), Android 13/14 permission paths, opening the .docx in Word *on the phone* (emulator has no viewer; verified with Word on Windows), release-mode timings.

**Decisions from Phase 0:** `docx` 9.8.1 + `fflate` (not jszip) · `Directory.pickDirectoryAsync` (new API) instead of the legacy StorageAccessFramework · stage large files in `Paths.cache` and `copy()` to/from SAF · development build for everything (EAS project `@aaki-m/FoodDiaryApp`, package `com.aakashmakhija.fooddiary`).

## Implementation phases (step by step, each ends with lint + tsc + tests green and a commit)
**Phase 0 – De-risking spikes (throwaway branch) — DONE 03.10.2026, see Phase 0 results:** (a) `docx` → `Packer.toBase64String` under Hermes with 1 embedded JPEG, opened in Word/Docs; (b) SAF folder pick → write a 20 MB binary → restart the app → write again (confirms persistence); (c) zip/unzip of photos with fflate; (d) a DATE-trigger notification at an exact time. Results decide the final library choices.

**Phase 1 – Foundation — DONE 04.10.2026:** all remaining native modules installed up front (`expo-sqlite`, `expo-image-picker`, `expo-image-manipulator`, `expo-print`, `expo-crypto`) plus plugin config (camera permission, mic blocked, notification icon, sage splash), so one development build covers Phases 1–6. `src/lib/db`: `Db` interface (`expoDb.ts` for the app, `node:sqlite` in tests), schema v1 with CHECK/FK constraints and `PRAGMA user_version` migrations (refuses a newer schema), `diaryRepo.ts` (day/range/summary reads, transactional `saveMeal` that returns removed photo files, `saveDayText`, validation), `settingsRepo.ts` (typed defaults), `DbProvider` running migrations at start. `src/lib/completeness.ts`, `src/lib/dates.ts` (+ `isDateKey`), `src/lib/ids.ts`, `src/strings.ts`. Jest via jest-expo: 59 tests in `__tests__/` (dates incl. DST + ISO year boundaries, completeness, DB against real SQLite). Verified on the emulator: database created, `user_version = 1`, WAL. Notes: TypeScript 6 defaults `types` to `[]`, so `tsconfig.json` lists `jest` and `node`; run `npm test` / `npm run typecheck`.

**Phase 2 – Onboarding & settings — DONE 04.10.2026:** `src/state/settings.tsx` (SettingsProvider over SQLite, optimistic updates with per-key revert, `update()` never throws), splash held until fonts + DB + settings are loaded, themed root `ErrorBoundary`. Onboarding saves the name, asks for notifications for real (denied → Try again, blocked → Open phone settings) and picks the backup folder with `Directory.pickDirectoryAsync` plus a write probe (cancel = no change; tip about the Download-folder restriction). Settings show a warning when reminders are on but notifications are off (rechecked on focus and resume), the real backup folder with an accessibility check, and the last backup date; backup/restore/PDF actions say "coming soon" until Phase 6. Verified on Android 12 and Android 14 emulators (first launch, restart persistence, prompt deny ×2 → blocked, grant → warning clears, folder cancel/pick/moved). Notes: Android 14 does not pre-grant `SCHEDULE_EXACT_ALARM` (Phase 5). App display name changed to "Food Diary" (takes effect with the next build).

**Phase 3 – Daily logging — DONE 04.10.2026:** Meal editor on SQLite with real photos (`src/lib/photoPicker.ts` camera/gallery, `src/lib/photos.ts` resize to 1600 px JPEG q0.8 into `documents/photos`, copy-not-move so files aren't counted as cache), discard/skip/replace confirmations, meal-type change moves the entry in one transaction (`saveMeal(..., { fromType })`), unsaved imports deleted on discard. Water/exercise editor, Mealtimes calendar + day list, Progress, Home feed (recent photos, recent activity, initials avatar) and report screens read real data; `src/state/diaryEvents.ts` + `useDiaryQuery` refresh screens after writes; orphaned photo files are cleaned at startup. Mock data removed. **Bug found on device and fixed:** expo-sqlite's `withExclusiveTransactionAsync` opens a new connection without `PRAGMA foreign_keys`, so ON DELETE CASCADE silently didn't run; transactions now use one dedicated writer connection with the PRAGMAs (queued), the repo deletes photo rows explicitly, `repairOrphans` runs at start, and tests cover FK-off writes. Verified on the Android 14 emulator (gallery multi-pick, camera permission + capture, discard, save, skip with reason, move type, restart persistence). Not yet handled: Android killing the app while the camera is open (`getPendingResultAsync`) loses the in-progress edit.

**Phase 4 – Report:** `src/lib/report/model.ts` (DB → ReportModel, includes "Not logged" days); `src/app/report/index.tsx` (range picker, max 7 days) and `preview.tsx`; `src/lib/report/docx.ts` (header, per-day tables, 800px images); open via intent-launcher (content URI), save to folder, share via expo-sharing. Tests for the model and the docx builder (structure).

**Phase 5 – Reminders:** `src/lib/notifications/schedule.ts` (pure function: settings + today's state → list of triggers, unit tested) and `apply.ts` (cancel/reschedule via expo-notifications, channels). Hooks into save, app foreground and settings changes. Exact-alarm permission check with a settings deep link.

**Phase 6 – Backup / restore / PDF:** `src/lib/backup/*` (serialise to data.json with schemaVersion + photos → ZIP → SAF folder; auto-run on open if ≥7 days; +7d overdue notification; restore with validation, safety backup and replace-all); "Export all as PDF" via expo-print from the shared ReportModel HTML; Settings shows last backup time and folder size. Round-trip tests.

**Phase 7 – Polish & release:** empty/error states, accessibility labels, battery-optimisation hint, `npx expo-doctor`, preview APK build via EAS, full device checklist.

## Verification (for the implementation phase)
`npx expo lint`, `npx tsc --noEmit`, `npx jest`. Then build a development APK (`npx eas-cli@latest build -p android --profile development`) and run the device checklist: onboarding, log/skip/photos, report preview → docx opens in Word/Docs with images, share to WhatsApp/email, water reminders fire at the right hours, end-of-day lists the correct missing items, backup runs after 7 days (simulated by changing the clock), restore on a clean install.
