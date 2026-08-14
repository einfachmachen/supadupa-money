// Theme-Validator: Prüft Kontrast-Kombinationen und schlägt bessere Farben vor

/**
 * WCAG Luminance berechnen (für Kontrast-Ratio)
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(hexColor) {
  // Hex → RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  // Gamma-Korrektur
  const luminance = (color) => {
    if (color <= 0.03928) return color / 12.92;
    return Math.pow((color + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);
}

/**
 * WCAG Kontrast-Ratio zwischen zwei Farben
 */
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Farbe aufhellen oder abdunkeln
 */
function adjustColorLuminance(hexColor, percent) {
  const hex = hexColor.replace('#', '');
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);

  // Luminance adjustieren
  r = Math.min(255, Math.max(0, Math.round(r * (1 + percent))));
  g = Math.min(255, Math.max(0, Math.round(g * (1 + percent))));
  b = Math.min(255, Math.max(0, Math.round(b * (1 + percent))));

  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
}

/**
 * Bessere Farbe für einen gegebenen Hintergrund vorschlagen
 */
function suggestBetterColor(bgColor, targetColor, minContrast = 4.5, isLight = true) {
  // Versuche die Farbe schrittweise dunkler/heller zu machen
  let current = targetColor;
  let contrast = getContrastRatio(bgColor, current);
  let step = isLight ? -0.05 : 0.05; // Light Themes: dunkler, Dark: heller
  let attempts = 0;

  while (contrast < minContrast && attempts < 20) {
    current = adjustColorLuminance(current, step);
    contrast = getContrastRatio(bgColor, current);
    attempts++;
  }

  return {
    color: current,
    contrast: contrast.toFixed(2),
    improved: contrast >= minContrast,
  };
}

/**
 * Haupt-Validierungsfunktion
 */
export function validateTheme(themeName, theme) {
  const issues = [];
  const suggestions = [];

  // Erkenne, ob Light oder Dark Theme
  const isLight = theme.txt === '#000000' || theme.txt === '#1E2418' || theme.txt?.startsWith('#1') || theme.txt?.startsWith('#2');

  // Kritische Farb-Kombinationen für Light Themes
  if (isLight) {
    const criticalPairs = [
      { bg: 'bg', fg: 'blue', minContrast: 4.5, label: 'bg + blue (Links/Buttons)' },
      { bg: 'bg', fg: 'pos', minContrast: 4.5, label: 'bg + pos (positiv)' },
      { bg: 'bg', fg: 'neg', minContrast: 4.5, label: 'bg + neg (negativ)' },
      { bg: 'bg', fg: 'gold', minContrast: 3.0, label: 'bg + gold (Warnungen)' },
      { bg: 'surf', fg: 'txt2', minContrast: 4.5, label: 'surf + txt2 (Sekundärtext)' },
      { bg: 'surf', fg: 'lbl', minContrast: 3.0, label: 'surf + lbl (Labels)' },
    ];

    criticalPairs.forEach(({ bg, fg, minContrast, label }) => {
      if (!theme[bg] || !theme[fg]) return;

      const bgColor = theme[bg];
      const fgColor = theme[fg];

      // rgba ignorieren - nur hex prüfen
      if (fgColor.includes('rgba') || fgColor.includes('rgb(')) {
        issues.push({
          theme: themeName,
          type: 'rgba-in-light',
          message: `⚠️  ${label}: ${fgColor} ist semi-transparent - auf hellem Grund problematisch`,
          severity: 'warning',
        });
        return;
      }

      const contrast = getContrastRatio(bgColor, fgColor);
      if (contrast < minContrast) {
        const suggestion = suggestBetterColor(bgColor, fgColor, minContrast, true);
        issues.push({
          theme: themeName,
          type: 'low-contrast',
          message: `❌ ${label}: ${contrast.toFixed(2)}:1 (soll ${minContrast}:1)`,
          current: fgColor,
          suggested: suggestion.color,
          contrast: contrast.toFixed(2),
          severity: 'error',
        });
        suggestions.push({
          theme: themeName,
          label,
          current: fgColor,
          suggested: suggestion.color,
          contrast: `${contrast.toFixed(2)} → ${suggestion.contrast}:1`,
        });
      }
    });
  } else {
    // Dark Themes: hellere Akzent-Farben auf dunklem Grund
    const criticalPairs = [
      { bg: 'bg', fg: 'txt', minContrast: 4.5, label: 'bg + txt (Haupttext)' },
      { bg: 'bg', fg: 'txt2', minContrast: 4.5, label: 'bg + txt2 (Sekundärtext)' },
      { bg: 'bg', fg: 'blue', minContrast: 4.5, label: 'bg + blue (Akzent)' },
      { bg: 'bg', fg: 'pos', minContrast: 4.5, label: 'bg + pos (positiv)' },
    ];

    criticalPairs.forEach(({ bg, fg, minContrast, label }) => {
      if (!theme[bg] || !theme[fg]) return;

      const bgColor = theme[bg];
      const fgColor = theme[fg];

      // rgba: Luminance kann nicht korrekt berechnet werden
      if (fgColor.includes('rgba') || fgColor.includes('rgb(')) {
        return; // Für Dark Themes OK, rgba(200,210,220,0.8) ist hell genug
      }

      const contrast = getContrastRatio(bgColor, fgColor);
      if (contrast < minContrast) {
        issues.push({
          theme: themeName,
          type: 'low-contrast',
          message: `❌ ${label}: ${contrast.toFixed(2)}:1 (soll ${minContrast}:1)`,
          current: fgColor,
          severity: 'error',
        });
      }
    });
  }

  return { issues, suggestions };
}

/**
 * Alle Themes validieren
 */
export function validateAllThemes(THEMES) {
  const allIssues = [];
  const allSuggestions = [];

  Object.entries(THEMES).forEach(([key, theme]) => {
    if (key === 'custom_preview') return;
    if (!theme.name) return;

    const { issues, suggestions } = validateTheme(theme.name, theme);
    allIssues.push(...issues);
    allSuggestions.push(...suggestions);
  });

  return { allIssues, allSuggestions };
}

/**
 * Report ausgeben
 */
export function printValidationReport(allIssues, allSuggestions) {
  if (allIssues.length === 0) {
    console.log('✅ Alle Themes: Kontrast OK!');
    return;
  }

  console.log('\n🎨 Theme-Validierung:\n');

  // Gruppiere nach Theme
  const byTheme = {};
  allIssues.forEach((issue) => {
    if (!byTheme[issue.theme]) byTheme[issue.theme] = [];
    byTheme[issue.theme].push(issue);
  });

  Object.entries(byTheme).forEach(([themeName, issues]) => {
    console.log(`\n${themeName}:`);
    issues.forEach((issue) => {
      if (issue.type === 'rgba-in-light') {
        console.log(`  ${issue.message}`);
      } else {
        console.log(`  ${issue.message}`);
        if (issue.suggested) {
          console.log(`    💡 Bessere Farbe: ${issue.suggested}`);
        }
      }
    });
  });

  // Vorschläge zusammenfassen
  if (allSuggestions.length > 0) {
    console.log('\n📋 Vorgeschlagene Änderungen:\n');
    allSuggestions.forEach((sug) => {
      console.log(`  ${sug.theme} → ${sug.label}`);
      console.log(`    ${sug.current} → ${sug.suggested}`);
      console.log(`    Kontrast: ${sug.contrast}\n`);
    });
  }
}
