/**
 * expo-notifications' config plugin always adds the `aps-environment`
 * (Push Notifications) entitlement. This app only schedules local
 * notifications, which don't need it — and shipping an unused push
 * entitlement means provisioning a capability we never use.
 *
 * Must be listed BEFORE "expo-notifications" in app.json: entitlements
 * mods run in reverse registration order, so this runs after it.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
