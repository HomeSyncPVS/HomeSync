# HomeSync — Frontend (React Native + Expo)

Built from the Stitch mockups you generated, reconciled into one consistent design system
and rebuilt as actual working React Native screens (not static HTML).

## Setup

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) to run on your phone, or press `i`/`a` in the
terminal for iOS/Android simulators.

## Theming

Everything reads colors from `src/theme/ThemeContext.tsx`, which exposes light, dark, and
"system" modes. Toggle it live from the **Profile tab → Appearance**. All screens use
`useTheme()` — no hardcoded colors — so both themes stay in sync automatically as you add
more screens.

## Screens included

| File | Screen |
|---|---|
| `src/screens/auth/SplashScreen.tsx` | Welcome / login chooser |
| `src/screens/auth/LoginScreen.tsx` | Phone number entry |
| `src/screens/auth/OtpVerifyScreen.tsx` | 6-digit OTP verification (working auto-advance + countdown) |
| `src/screens/home/HomeScreen.tsx` | Resident dashboard (maintenance card, quick actions, notices, events) |
| `src/screens/home/ProfileScreen.tsx` | Profile + theme switcher |
| `src/screens/bills/CurrentBillScreen.tsx` | Current bill breakdown + Pay Now |
| `src/screens/bills/PaymentHistoryScreen.tsx` | Filterable payment history |
| `src/screens/bills/PaymentSuccessScreen.tsx` | Post-payment confirmation |
| `src/screens/complaints/ComplaintsListScreen.tsx` | Complaint list with stats |
| `src/screens/complaints/RaiseComplaintScreen.tsx` | Raise complaint form (working validation) |
| `src/screens/complaints/ComplaintDetailScreen.tsx` | Complaint detail + status timeline |
| `src/screens/notices/NoticesScreen.tsx` | Notice feed (emergency/poll/event/general) |
| `src/screens/events/EventsScreen.tsx` | Upcoming/past events list |
| `src/screens/events/EventDetailScreen.tsx` | Event detail + working RSVP |
| `src/screens/admin/AdminDashboardScreen.tsx` | Admin operational dashboard |

Shared building blocks: `src/components/Header.tsx`, `Card.tsx`, `StatusChip.tsx`.
Navigation: `src/navigation/RootNavigator.tsx` (stack) + `ResidentTabs.tsx` (bottom tabs).

## What's real vs. what's a placeholder

**Working right now (client-side only):**
- Navigation between all screens
- Form state and validation (Raise Complaint, Login, OTP)
- OTP auto-advance/backspace and countdown timer
- RSVP selection + guest counter
- Payment history filter chips
- Priority selector, category picker
- Light/dark/system theme switching

**Marked with `// TODO` — needs your backend to actually do something:**
- `POST /auth/send-otp`, `POST /auth/verify-otp` (Login/OtpVerify screens)
- `POST /complaints` with photo upload (RaiseComplaint screen)
- Razorpay `create-order` / `verify` (CurrentBill screen — currently just navigates to
  the success screen without a real charge)
- `POST /events/{id}/rsvp` (EventDetail screen)
- All list data (complaints, notices, events, bills) is hardcoded sample data — swap for
  React Query + your API once endpoints exist, per the API sequence doc.

## Next steps
1. `npm install` and confirm it runs in Expo Go.
2. Wire the auth screens to your real `/auth/*` endpoints first (per Phase 1 of your API
   sequence) — everything else depends on having a session token.
3. Replace hardcoded arrays (`COMPLAINTS`, `NOTICES`, `EVENTS`, etc.) with data fetched via
   TanStack Query, matching the build order from the frontend guide.
4. Add `expo-image-picker` for real photo capture in Raise Complaint (currently a
   placeholder push).
