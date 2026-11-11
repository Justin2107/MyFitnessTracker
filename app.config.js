// Apple Health needs the HealthKit entitlement, which only a paid Apple Developer account can sign.
// It is off by default so the app installs with a free Apple ID from Xcode.
// To include it (paid account), build with APPLE_HEALTH=1, e.g. `APPLE_HEALTH=1 npx expo prebuild --clean`.
// EAS builds turn it on through eas.json.
const HEALTHKIT = '@kingstinct/react-native-healthkit';

module.exports = ({ config }) => {
  const health = process.env.APPLE_HEALTH === '1';
  return {
    ...config,
    plugins: health ? config.plugins : config.plugins.filter((p) => (Array.isArray(p) ? p[0] : p) !== HEALTHKIT),
    extra: { ...config.extra, appleHealth: health },
  };
};
