# My Fitness Tracker

An iPhone app for tracking calories eaten and burned, training, steps, weight and body measurements. Built with Expo (React Native) and TypeScript.

- **Food:** describe a meal or take a photo for a calorie and macro estimate (uses your Anthropic API key), or enter it manually.
- **Burned:** resting metabolism, daily activity, digestion, steps and training, per day.
- **Training:** lifts set by set with estimated 1RM and PRs; cardio with watch or estimated calories.
- **Body:** measurements, Navy body fat, lean mass, FFMI, waist and shoulder ratios, progress photos.
- **Trends:** weight trend, 28-day calories, steps, and maintenance calculated from your own data.
- **Apple Health:** steps, weigh-ins and workouts sync automatically.

All data is stored on the phone in SQLite. Use **Setup → Export backup** to save a copy to iCloud Drive or Files.

## Install on your iPhone (free, with a Mac)

You need a Mac with Xcode and Node.js (LTS). A free Apple ID works; the trade-off is that the app must be reinstalled from your Mac every 7 days. Your data stays on the phone between reinstalls, as long as you don't delete the app.

One-time setup:

1. Install **Xcode** from the Mac App Store, open it once to finish installing, then sign in with your Apple ID under **Xcode → Settings → Accounts**.
2. Install **Node.js** (LTS) from [nodejs.org](https://nodejs.org) and **CocoaPods** with `brew install cocoapods`.
3. On your iPhone, turn on **Settings → Privacy & Security → Developer Mode** and restart it.
4. Get the code and generate the iOS project:
   ```sh
   git clone https://github.com/Justin2107/MyFitnessTracker.git
   cd MyFitnessTracker
   npm install
   npx expo prebuild --platform ios
   open ios/*.xcworkspace
   ```
5. In Xcode, click the project in the left sidebar → target **MyFitnessTracker** → **Signing & Capabilities** → set **Team** to your name (Personal Team).

Install (and repeat every 7 days):

```sh
npx expo run:ios --device --configuration Release
```

Plug in your iPhone, pick it from the list, and wait for the build. The first time, the iPhone will block the app: go to **Settings → General → VPN & Device Management**, tap your Apple ID, then **Trust**.

### Apple Health (paid account only)

Reading steps, weight and workouts from Apple Health needs the HealthKit entitlement, which only a paid [Apple Developer Program](https://developer.apple.com/programs/) membership can sign, so it is left out of the default build. With a paid account:

- **From your Mac:** `APPLE_HEALTH=1 npx expo prebuild --platform ios --clean`, then install as above.
- **Or via TestFlight** (no 7-day expiry): `npx testflight`. The EAS build profiles in `eas.json` turn Apple Health on.

## First run

1. **Setup tab:** tap **Import backup** and choose the JSON file exported from the web version (Setup → Export JSON there). Or fill in your profile if you're starting fresh.
2. **Apple Health** (paid-account builds only): turn it on in Setup and allow steps, weight and workouts.
3. **Food estimates:** paste your Anthropic API key (from [console.anthropic.com](https://console.anthropic.com)) in Setup. Each estimate is billed to your Anthropic account.

## Develop

```sh
npm run typecheck   # TypeScript
npm test            # unit tests for the calculations and import
```

The app uses native modules (HealthKit, SQLite), so it does not run in Expo Go. For live development on your phone, build a development client once with `npx eas-cli@latest build --profile development --platform ios`, install it, then run `npx expo start`.

### Layout

- `src/app/` screens (Expo Router tabs)
- `src/lib/calc.ts` all calculations; pure TypeScript, unit tested in `tests/`
- `src/lib/store.tsx` on-device SQLite storage
- `src/lib/health.ts` Apple Health sync
- `src/lib/claude.ts` food estimates via the Anthropic API
- `src/lib/backup.ts` export, import and progress photos

### How the numbers work

- **BMR:** Mifflin–St Jeor. **Daily activity:** 10% of BMR. **Digestion:** 10% of calories eaten.
- **Steps:** 0.0005 kcal × body weight (kg) per step.
- **Training:** net METs (MET − 1) × weight × hours; lifting uses 4 net METs, or the Apple Watch figure when a strength workout is synced.
- **Weight trend:** exponential moving average, 10% per day.
- **Measured maintenance:** average intake over up to 28 days, corrected by the trend change at 7,700 kcal per kg.
- **Estimated 1RM:** Epley. **Body fat:** US Navy tape method unless entered directly.
