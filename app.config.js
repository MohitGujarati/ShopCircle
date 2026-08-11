/**
 * app.config.js — dynamic app config.
 *
 * WHY THIS EXISTS ALONGSIDE app.json:
 *   Expo reads app.json first and passes it here as `config`, so this file only
 *   has to change the parts that must be COMPUTED. Static JSON can't run code,
 *   and versionCode has to.
 *
 * WHY versionCode HAS TO BE COMPUTED:
 *   Android refuses to install an APK whose versionCode isn't higher than the
 *   one already on the device. Left in app.json it would be 1 forever, and your
 *   testers would hit "app not installed" on the SECOND build you send them.
 *   GITHUB_RUN_NUMBER increments on every workflow run, so it's monotonic for
 *   free. Local builds fall back to 1.
 */
export default ({ config }) => ({
    ...config,
    android: {
        ...config.android,
        versionCode: Number(process.env.GITHUB_RUN_NUMBER ?? 1),
    },
});
