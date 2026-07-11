// Wiring-Metadaten für die interaktive, hervorhebende Feature-Tour
// (GuidedFeatureTour.jsx) — Index i gehört zu FEATURE_TOUR[i]
// (content/featureTour.js). Legt fest, auf welchem Tab das erklärte Element
// liegt und über welches data-tour-Attribut es zu finden ist.
// selector:null = kein einzelnes Element (rein konzeptionelle Erklärung),
// die Tour zeigt dafür eine zentrierte Karte ohne Hervorhebung.
const FEATURE_TOUR_TARGETS = [
  { tab: "home",  selector: '[data-tour="hero-balance"]' },   // Kontostand & Prognose
  { tab: "home",  selector: '[data-tour="cat-list"]' },       // Kategorien & Ausgabenübersicht
  { tab: "daten", selector: '[data-tour="row-budget"]' },     // Budgets & Vormerkungen
  { tab: "daten", selector: '[data-tour="row-bank"]' },       // Bank-Anbindung & Import
  { tab: "daten", selector: '[data-tour="row-matching"]' },   // Vormerkungen automatisch zuordnen
  { tab: "daten", selector: '[data-tour="row-konten"]' },     // Sparen & Tagesgeld
  { tab: "daten", selector: '[data-tour="row-cloudsync"]' },  // Cloud-Synchronisierung
  { tab: "home",  selector: null },                             // Offline & Datenschutz
  { tab: "home",  selector: '[data-tour="theme-switcher"]' }, // Themes & Personalisierung
];

export { FEATURE_TOUR_TARGETS };
