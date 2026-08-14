#!/usr/bin/env node

// Auto-Fixer für Theme-Kontrast-Probleme
// Anwendung: node tools/fixThemeContrast.mjs

import fs from 'fs';
import { THEMES } from '../src/theme/themes.js';
import { validateAllThemes } from '../src/theme/validateTheme.js';

const themesPath = './src/theme/themes.js';
let themesContent = fs.readFileSync(themesPath, 'utf-8');

const { allIssues, allSuggestions } = validateAllThemes(THEMES);

console.log('🔧 Theme Contrast Auto-Fixer\n');
console.log('='.repeat(60));

if (allSuggestions.length === 0) {
  console.log('✅ Alle Themes sind bereits OK!');
  process.exit(0);
}

// Gruppiere nach Theme
const byTheme = {};
allSuggestions.forEach((sug) => {
  if (!byTheme[sug.theme]) byTheme[sug.theme] = [];
  byTheme[sug.theme].push(sug);
});

let fixCount = 0;

// Für jedes Theme die Fixes anwenden
Object.entries(byTheme).forEach(([themeName, suggestions]) => {
  console.log(`\n${themeName}:`);

  suggestions.forEach((sug) => {
    const regex = new RegExp(
      `(${themeName}\\.replace\\(/.*?\\)|${themeName}.*?\\{[^}]*?)(${sug.current.replace(/\./g, '\\.')})`,
      'gi'
    );

    // Einfach: Ersetze die alte Farbe durch die neue
    const oldValue = sug.current;
    const newValue = sug.suggested;

    // Suche nach dem Theme-Key und ersetze dort
    // z.B. "blue: "#6B9900"" → "blue: "#537600""

    const themeKeyRegex = new RegExp(
      `(\\b${themeName}\\s*:\\s*\\{[^]*?)(${oldValue.replace(/[#()]/g, '\\$&')})`,
      'i'
    );

    if (themesContent.includes(oldValue)) {
      // Nur in diesem Theme ersetzen
      const beforeTheme = themesContent.indexOf(`${themeName}:`);
      const nextTheme = themesContent.indexOf('\n  ', beforeTheme + 50);

      if (beforeTheme !== -1 && nextTheme !== -1) {
        const themeBlock = themesContent.substring(beforeTheme, nextTheme);
        if (themeBlock.includes(oldValue)) {
          const updated = themeBlock.replace(oldValue, newValue);
          themesContent = themesContent.replace(themeBlock, updated);
          fixCount++;
          console.log(`  ✅ ${sug.label}`);
          console.log(`     ${oldValue} → ${newValue}`);
          console.log(`     Kontrast: ${sug.contrast}`);
        }
      }
    }
  });
});

// Schreibe die aktualisierten Themes
fs.writeFileSync(themesPath, themesContent);

console.log('\n' + '='.repeat(60));
console.log(`\n✨ ${fixCount} Farben aktualisiert!\n`);
console.log('📝 Nächste Schritte:');
console.log('  1. npm run build   (Testen)');
console.log('  2. node tools/validateThemes.mjs  (Überprüfen)');
