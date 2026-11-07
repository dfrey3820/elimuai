# ElimuAI Mobile

Flutter app for Android and iOS, sharing the existing ElimuAI backend. The web
target is a development preview, not a replacement for the existing website.

## Run

Requires Flutter 3.44 or later (Dart 3.12), Android Studio for Android, and Xcode
with CocoaPods on macOS for iOS.

```sh
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=https://api.elimuai.africa
```

Select a simulator or attached device with `flutter devices` and `flutter run -d DEVICE_ID`.
For a browser preview:

```sh
flutter run -d web-server --web-port 8088
```

Use the HTTPS gateway origin, without `/api`, as `API_BASE_URL`. The default is
`https://api.elimuai.africa`. The website origin `https://elimuai.africa` serves
HTML and is not the API host on the cPanel deployment. Physical devices cannot reach your Mac through
`localhost`. For local development, expose the gateway through an HTTPS tunnel.
Browser previews additionally need the API gateway to allow their origin through
CORS. Do not put backend provider keys or the backend `.env` in this app; all
`--dart-define` values are public in compiled applications.

## Included

- Password sign-in, emailed OTP verification, resend cooldown, secure session
	storage, token refresh, and sign-out.
- Learning dashboard and subject/lesson search using the authenticated profile's
	country, curriculum, and grade.
- Markdown lesson reader, on-device downloads, and locally tracked reading progress.
- AI tutor connected to `/api/ai/tutor`, with subject selection, conversation
	history, retryable failures, and subscription restriction messages.
- Photo Scan with native camera/gallery selection, image preview, subject and
	solve/check modes, and streamed answers from `/api/ai/photoscan/analyse`.
	Access is checked through `/api/payments/subscription-status` before selection
	and again before uploading. The server independently enforces AI entitlement.
	Existing personal plans, school plans, trials, and admin exemptions follow the
	backend's `aiEnabled` policy. Unsupported formats and photos over 5 MB are rejected.
- Native role workspaces for students, teachers, parents, school administrators,
	and platform administrators, with role-filtered tools and read-only demo previews.
- Structured people profiles with verification badges, learning metrics, contact
	copying, activity, billing, and AI-session tabs. Authorized platform admins can
	confirm role and subscription changes; demo profiles are read-only.
- Server-backed user search/role filters, clear people-directory status rows,
	subject-progress bars, subscription access summaries, and school metrics.
- Persisted light/dark appearance and adaptive phone/tablet layouts.
- Explicit demo account with sample lessons. Demo never sends tutor requests or
	invents AI answers. Its downloaded content and progress are separate from live accounts.
- Bundled photo and Manrope font for offline rendering. Manrope's license is in
	`assets/fonts/OFL.txt`.

Registration, OTP verification, profile updates, password changes, device sessions,
account deletion, and password recovery are native. No screen opens a browser.
Recovery requests an emailed reset code, then accepts that code and a new password
inside the app. It requires the updated backend auth routes described below.
The role workspaces include child onboarding, classes, student/teacher rosters and
invitations, lesson authoring, school statistics, AI insights, exam practice/results,
homework help, achievements, leaderboards, and billing records. Platform administrators
also have user, transaction, and SMS directories. This is not complete endpoint parity:
subscription purchasing, coupons, marketing/insurance networks, platform settings,
PDF invoice downloads, and some advanced user administration still require follow-up.
Reading progress is local to this device, not synced.
Downloaded lessons are stored in the app sandbox, scoped by account, and survive
sign-out for the same account's next sign-in. They are not encrypted; avoid saving
sensitive material on shared devices. Remove a download from its reader's bookmark
button. A first live sign-in requires network access.

## Verify

```sh
flutter analyze
flutter test
flutter build apk --debug
flutter build ios --simulator --no-codesign
```

Tests cover OTP contracts, token rotation, API errors, offline persistence, form
validation, and reading/saving/navigation at 320px, 430px, and 1024px widths.
They use mocked APIs and do not send email or consume AI credits.
Photo Scan tests additionally verify subscription denial prevents uploading,
camera/gallery-to-answer flows at small-phone width, permission errors, server-side
subscription rejection, interrupted streams, and image-size limits. Actual camera
capture requires a physical device; the iOS simulator can use photos from its library.

The role-route smoke tests open every current feature for students, parents,
teachers, school admins, and platform admins at 320px width and navigate back.
Additional widget tests cover native parent onboarding, class creation, permission
failures, exact password preservation, unfinished-exam exit, and the complete
password-recovery success/error flow. These are mocked-API tests, not a claim that
all production workflows or every device have been verified.

## Recovery Backend Deployment

The existing production API was verified to return 404 for
`POST /api/auth/forgot-password` before these changes. Deploy the changed auth
service, shared auth library, and monolith before live recovery can send email.
The cPanel workflow now smoke-checks both public recovery routes. No schema
migration is needed: reset codes use the existing `otp_tokens` table with a
separate `password_reset` purpose.

- `POST /api/auth/forgot-password`: `{email}`; a generic response avoids account disclosure.
- `POST /api/auth/reset-password`: `{email, code, new_password}`; requires an
	expiring six-digit code, enforces attempt limits, consumes it once, updates the
	password, and revokes existing sessions/refresh tokens in one transaction.
- The monolith now checks active session records on protected requests and
	rejects refresh tokens presented as access tokens. Legacy manually minted JWTs
	without a corresponding active session will require a new sign-in. Cron jobs
	must use a real active admin session, not a standalone minted JWT.
- Recovery email uses the configured notification provider. Delivery and real
	database concurrency still need a staging/live smoke test after deployment.
	The app reports an unavailable service rather than simulating success when the
	production recovery endpoints have not yet been deployed.

## Distribution

The scaffold uses application ID `africa.elimuai.elimuai_mobile`. Confirm this
permanent identifier before registering store listings.

For an installable Android test build, run `flutter build apk --debug` and install
`build/app/outputs/flutter-apk/app-debug.apk`. For Google Play, create an upload
keystore and a private `android/key.properties` file with `storeFile` (an absolute
path), `storePassword`, `keyAlias`, and `keyPassword`, then run:

```sh
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.elimuai.africa
```

Release builds are deliberately not signed with a debug key. Keep signing files
and passwords out of git. iOS distribution requires your Apple Developer team,
bundle ID, provisioning, and signing configuration in `ios/Runner.xcworkspace`:

```sh
flutter build ipa --release --dart-define=API_BASE_URL=https://api.elimuai.africa
```

Complete device testing, privacy disclosures, age ratings, store screenshots,
account-deletion requirements, and store review before publication. Digital
subscription purchases need a separate App Store/Google Play policy review;
this app does not initiate payments. No store upload is automated here.

## Samsung Preview Build

The `Android Mobile Preview` GitHub workflow builds a debug ARM64 APK on branches
matching `mobile/samsung-preview-*`, without triggering cPanel deployment. It runs
analysis and the mobile tests first, then uploads `elimuai-samsung-debug` with
`app-debug.apk` and its SHA-256 checksum. Download the artifact and install on an
authorized USB-debugging device with `adb -s DEVICE_SERIAL install -r app-debug.apk`.
This debug-signed APK is for device testing, not store distribution.
