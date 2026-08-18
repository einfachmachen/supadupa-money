// Lizenz-Stufenmodell: Welche Fähigkeit in welcher Stufe freigeschaltet ist.
//
// Bewusst app-übergreifend gedacht: `products` im Token trägt, für welche
// SupaDupa-Apps der Code gilt. `tier` separiert die Stufen. Ein Money-Code
// kann "pro" sein, eine spätere App dann "premium" oder "promax".
//
// Gates fragen nach *Fähigkeiten* (`hasFeature("bank_connect")`), nicht nach
// Stufennamen. Das ermöglicht es, die Stufenlogik später zu ändern, ohne
// jeden Gate zu ändern.

// Stufendefinition: tier → Fähigkeiten
const TIER_FEATURES = {
  free: [],
  premium: ["cloud_sync"],
  pro: ["cloud_sync", "bank_connect"],
  promax: ["cloud_sync", "bank_connect"],
};

// Welche Stufe braucht man für eine Fähigkeit?
function requiredTier(feature) {
  for (const [tier, features] of Object.entries(TIER_FEATURES)) {
    if (features.includes(feature)) return tier;
  }
  return null;
}

// Hat eine Stufe die Fähigkeit?
function tierHasFeature(tier, feature) {
  const features = TIER_FEATURES[tier] || [];
  return features.includes(feature);
}

// Beispiel: licenseData = { tier: "pro", products: ["money"], ... }
// hasFeature(licenseData, "bank_connect") → true
// hasFeature(licenseData, "cloud_sync") → true
function hasFeature(licenseData, feature) {
  if (!licenseData || !licenseData.tier) return false;
  return tierHasFeature(licenseData.tier, feature);
}

export { TIER_FEATURES, requiredTier, tierHasFeature, hasFeature };
