# My Fitness Tracker

An iPhone app for tracking calories eaten and burned, training, steps, weight and body measurements. Built with Expo (React Native) and TypeScript.

- **Food:** describe a meal or take a photo for a calorie and macro estimate (uses your Anthropic API key), or enter it manually.
- **Burned:** resting metabolism, daily activity, digestion, steps and training, per day.
- **Training:** lifts set by set with estimated 1RM and PRs; cardio with watch or estimated calories.
- **Body:** measurements, Navy body fat, lean mass, FFMI, waist and shoulder ratios, progress photos.
- **Trends:** weight trend, 28-day calories, steps, and maintenance calculated from your own data.
- **Apple Health:** steps, weigh-ins and workouts sync automatically.

All data is stored on the phone in SQLite. Use **Setup → Export backup** to save a copy to iCloud Drive or Files.

## Install on your iPhone

You need a computer with [Node.js](https://nodejs.org) (LTS version) and an [Apple Developer Program](https://developer.apple.com/programs/) membership (paid, yearly). No Mac is required; Expo builds the app in the cloud.

1. **Get the code and install packages**
   ```sh
   git clone https://github.com/<you>/<repo>.git
   cd <repo>
   npm install
   ```
2. **Set a unique app ID.** In `app.json`, change `ios.bundleIdentifier` from `com.myfitness.tracker` to something unique to you, for example `com.yourname.fitnesstracker`.
3. **Create a free Expo account** at [expo.dev](https://expo.dev), then log in:
   ```sh
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
4. **Build and send to TestFlight** (one command; it signs in to your Apple account, creates certificates and the App Store Connect record for you):
   ```sh
   npx testflight
   ```
   The cloud build takes roughly 10 to 20 minutes. Apple then processes it before it appears in TestFlight.
5. **Install** the TestFlight app from the App Store on your iPhone, sign in with the same Apple ID, and install My Fitness Tracker from there.

To ship an update later, run `npx testflight` again and update the app in TestFlight.

## First run

1. **Setup tab:** tap **Import backup** and choose the JSON file exported from the web version (Setup → Export JSON there). Or fill in your profile if you're starting fresh.
2. **Apple Health:** turn it on in Setup and allow steps, weight and workouts.
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
