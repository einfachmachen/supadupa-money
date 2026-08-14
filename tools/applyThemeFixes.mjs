#!/usr/bin/env node

// Interaktive Theme-Fix-Anwendung
// Zeigt vorgeschlagene Fixes und fragt nach Bestätigung

import fs from 'fs';
import readline from 'readline';
import { THEMES } from '../src/theme/themes.js';
import { validateAllThemes } from '../src/theme/validateTheme.js';

const { allSuggestions } = validateAllThemes(THEMES);

if (allSuggestions.length === 0) {
  console.log('✅ Alle Themes sind bereits OK!');
  process.exit(0);
}

console.log('🔧 Theme Contrast — Vorgeschlagene Fixes\n');
console.log('='.repeat(70));

// Gruppiere nach Theme
const byTheme = {};
allSuggestions.forEach((sug) => {
  if (!byTheme[sug.theme]) byTheme[sug.theme] = [];
  byTheme[sug.theme].push(sug);
});

// Zeige alle Vorschläge
Object.entries(byTheme).forEach(([themeName, suggestions]) => {
  console.log(`\n📋 ${themeName}:`);
  suggestions.forEach((sug, idx) => {
    console.log(`\n  [${idx + 1}] ${sug.label}`);
    console.log(`      Aktuell: ${sug.current}`);
    console.log(`      Besser:  ${sug.suggested}`);
    console.log(`      Kontrast: ${sug.contrast}`);
  });
});

console.log('\n' + '='.repeat(70));
console.log('\n💡 Kopiere die Vorschläge in deine themes.js und wende sie manuell an.');
console.log('   Oder nutze: node tools/validateThemes.mjs um später zu prüfen.\n');

// Export als JSON für Automatisierung
const fixes = {};
Object.entries(byTheme).forEach(([themeName, suggestions]) => {
  fixes[themeName] = suggestions.map((s) => ({
    field: s.label.split(' + ')[1].split(' ')[0].toLowerCase(),
    current: s.current,
    suggested: s.suggested,
    reason: s.label,
  }));
});

fs.writeFileSync('./theme-fixes.json', JSON.stringify(fixes, null, 2));
console.log('📄 Fixes gespeichert in: theme-fixes.json\n');
