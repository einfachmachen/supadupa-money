#!/usr/bin/env node

// Theme-Validator CLI Tool

import { THEMES } from '../src/theme/themes.js';
import { validateAllThemes, printValidationReport } from '../src/theme/validateTheme.js';

console.log('🎨 SupaDupa Money — Theme Validator\n');
console.log('='.repeat(50));

const { allIssues, allSuggestions } = validateAllThemes(THEMES);
printValidationReport(allIssues, allSuggestions);

console.log('\n' + '='.repeat(50));
if (allIssues.length === 0) {
  console.log('✅ Alle Themes sind valide!');
  process.exit(0);
} else {
  console.log(`❌ ${allIssues.length} Problem(e) gefunden.`);
  process.exit(1);
}
