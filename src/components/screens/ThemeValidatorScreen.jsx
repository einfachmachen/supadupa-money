import { useState, useMemo, useRef, useEffect } from 'react';
import { THEMES } from '../../theme/themes.js';
import { validateTheme } from '../../theme/validateTheme.js';
import { theme as T } from '../../theme/activeTheme.js';

const getLuminance = (hexColor) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const luminance = (color) => {
    if (color <= 0.03928) return color / 12.92;
    return Math.pow((color + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);
};

const getContrastRatio = (color1, color2) => {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Preview UI Component
function ThemePreview({ theme }) {
  return (
    <div style={{ background: theme.bg, color: theme.txt, minHeight: '100%', padding: '1rem', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ background: theme.surf, padding: '1rem', borderRadius: '8px', marginBottom: '1rem', borderBottom: `3px solid ${theme.bd}` }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: theme.txt }}>SupaDupa Money</h1>
        <p style={{ margin: '0.5rem 0 0 0', color: theme.txt2, fontSize: '0.9rem' }}>Theme-Vorschau</p>
      </div>

      {/* Hero Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ background: theme.surf, padding: '1rem', borderRadius: '6px', border: `1px solid ${theme.bd}` }}>
          <div style={{ color: theme.txt2, fontSize: '0.75rem' }}>Vermögen</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: theme.txt }}>€ 12.345</div>
        </div>
        <div style={{ background: theme.surf, padding: '1rem', borderRadius: '6px', border: `1px solid ${theme.bd}` }}>
          <div style={{ color: theme.txt2, fontSize: '0.75rem' }}>Ausgaben</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: theme.neg }}>€ -89</div>
        </div>
      </div>

      {/* Transaktionen */}
      <div style={{ background: theme.surf, padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: `1px solid ${theme.bd}` }}>
        <h4 style={{ margin: '0 0 0.75rem 0', color: theme.txt, fontSize: '0.95rem' }}>Transaktionen</h4>
        {[
          { name: 'Supermärkt', amount: '-45,99', color: theme.neg },
          { name: 'Gehalt', amount: '+3.500', color: theme.pos },
          { name: 'Nebenkosten', amount: '-120', color: theme.neg },
        ].map((tx, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 2 ? `1px solid ${theme.bd}` : 'none', alignItems: 'center' }}>
            <span style={{ color: theme.txt, fontSize: '0.9rem' }}>{tx.name}</span>
            <span style={{ color: tx.color, fontWeight: 'bold', fontSize: '0.9rem' }}>{tx.amount}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button style={{ padding: '0.6rem 1.2rem', background: theme.blue, color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
          Primär
        </button>
        <button style={{ padding: '0.6rem 1.2rem', background: theme.pos, color: '#000', border: 'none', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
          Erfolg
        </button>
        <button style={{ padding: '0.6rem 1.2rem', background: theme.neg, color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
          Löschen
        </button>
      </div>

      {/* Status Boxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ background: `${theme.pos}22`, border: `2px solid ${theme.pos}`, color: theme.txt, padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>
          ✅ Erfolg - Kontrast OK
        </div>
        <div style={{ background: `${theme.gold}22`, border: `2px solid ${theme.gold}`, color: theme.txt, padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>
          ⚠️ Warnung - 85% Budget
        </div>
        <div style={{ background: `${theme.neg}22`, border: `2px solid ${theme.neg}`, color: theme.txt, padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>
          ❌ Fehler - Kontrast schlecht
        </div>
      </div>
    </div>
  );
}

export default function ThemeValidatorScreen({ onThemeChange }) {
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [editedTheme, setEditedTheme] = useState(THEMES[selectedTheme]);
  const originalThemeRef = useRef(THEMES[selectedTheme]);

  const theme = editedTheme || THEMES[selectedTheme];
  const { issues, suggestions } = useMemo(
    () => validateTheme(theme.name || selectedTheme, theme),
    [theme, selectedTheme]
  );

  const handleThemeChange = (newTheme) => {
    setEditedTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  const handleColorChange = (colorKey, value) => {
    const newTheme = { ...editedTheme, [colorKey]: value };
    handleThemeChange(newTheme);
  };

  const handleResetAll = () => {
    const originalTheme = THEMES[selectedTheme];
    setEditedTheme(originalTheme);
    onThemeChange?.(originalTheme);
  };

  const handleResetColor = (colorKey) => {
    const newTheme = { ...editedTheme, [colorKey]: originalThemeRef.current[colorKey] };
    handleThemeChange(newTheme);
  };

  const handleSelectTheme = (themeName) => {
    const newTheme = THEMES[themeName];
    setSelectedTheme(themeName);
    setEditedTheme(newTheme);
    originalThemeRef.current = newTheme;
    handleThemeChange(newTheme);
  };

  // Color labels with descriptions
  const colorLabels = {
    bg: { name: 'Haupthintergrund', desc: 'Gesamter App-Hintergrund' },
    surf: { name: 'Kartenfläche', desc: 'Cards, Dialoge, Eingaben' },
    txt: { name: 'Primärtext', desc: 'Überschriften, Haupttext' },
    txt2: { name: 'Sekundärtext', desc: 'Hinweise, Labels, Untertitel' },
    blue: { name: 'Akzentfarbe', desc: 'Links, Buttons, Highlights' },
    pos: { name: 'Erfolg', desc: 'Positive Bestätigung' },
    neg: { name: 'Fehler/Warnung', desc: 'Negative Aktionen, Fehler' },
    gold: { name: 'Info-Warnung', desc: 'Leichte Warnungen, Info' },
    bd: { name: 'Rahmen/Linien', desc: 'Borders, Trennlinien' },
  };

  // Check which colors have contrast problems
  const colorProblems = new Map();
  suggestions.forEach((sug) => {
    const colorKey = sug.label.split(' + ')[1]?.split(' ')[0]?.toLowerCase();
    if (colorKey) {
      colorProblems.set(colorKey, sug);
    }
  });

  const generateExportCode = () => {
    const themeName = Object.keys(THEMES).find(
      (key) => THEMES[key].name === theme.name || key === selectedTheme
    );

    const themeObj = {};
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'object') {
        themeObj[key] = value;
      }
    });

    return `  ${themeName}: {\n    ${Object.entries(themeObj)
      .map(([k, v]) => `${k}:"${v}",`)
      .join('\n    ')}\n  },`;
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: T.bg }}>
      {/* LEFT: Live Preview der echten UI */}
      <div style={{ flex: '1 1 50%', borderRight: `2px solid ${T.bd}`, overflowY: 'auto', background: theme.bg }}>
        <ThemePreview theme={theme} />
      </div>

      {/* RIGHT: Controls */}
      <div style={{ flex: '1 1 50%', overflowY: 'auto', padding: '1.5rem', background: T.bg, color: T.txt }}>
        {/* Theme Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: T.txt2 }}>
            Theme:
          </label>
          <select
            value={selectedTheme}
            onChange={(e) => handleSelectTheme(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: T.surf,
              color: T.txt,
              border: `2px solid ${T.bd}`,
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            {Object.keys(THEMES)
              .filter((k) => k !== 'custom_preview')
              .map((key) => (
                <option key={key} value={key}>
                  {THEMES[key].name || key}
                </option>
              ))}
          </select>
        </div>

        {/* Validation Status - Detailed */}
        {suggestions.length > 0 ? (
          <div style={{ background: T.surf, border: `2px solid ${T.neg}`, borderRadius: '8px', padding: '1rem', marginBottom: '2rem' }}>
            <div style={{ color: T.neg, fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️ {suggestions.length} Kontrast-Problem{suggestions.length !== 1 ? 'e' : ''}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: T.txt2, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {suggestions.map((s, i) => {
                const bgColor = s.label.split(' + ')[0].toLowerCase();
                const fgColor = s.label.split(' + ')[1].split(' ')[0].toLowerCase();
                const contrast = getContrastRatio(theme[bgColor], s.current);
                const newContrast = getContrastRatio(theme[bgColor], s.suggested);
                return (
                  <div key={i} style={{ background: T.bg, padding: '0.75rem', borderRadius: '6px', border: `2px solid ${T.neg}` }}>
                    <div style={{ fontWeight: 600, color: T.txt, marginBottom: '0.25rem' }}>
                      {colorLabels[fgColor]?.name || fgColor} auf {colorLabels[bgColor]?.name || bgColor}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>Kontrast: {contrast.toFixed(2)}:1 → {newContrast.toFixed(2)}:1</span>
                      <button
                        onClick={() => applySuggestion(s)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: T.blue,
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        ✓ Vorschlag übernehmen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ background: T.pos, color: '#000', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontWeight: 'bold', textAlign: 'center' }}>
            ✅ Alle Kontraste sind korrekt!
          </div>
        )}

        {/* Reset Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <button
            onClick={handleResetAll}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: T.surf,
              color: T.txt,
              border: `2px solid ${T.bd}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            🔄 Alle zurücksetzen
          </button>
        </div>

        {/* Color Picker Grid - 2 columns */}
        <h3 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 700 }}>Farben bearbeiten</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {Object.entries(theme).map(([key, value]) => {
            if (typeof value !== 'string' || !value.startsWith('#')) return null;
            const hasChanged = originalThemeRef.current[key] !== value;
            const hasProblem = colorProblems.has(key);
            const label = colorLabels[key];

            return (
              <div
                key={key}
                style={{
                  background: T.surf,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `2px solid ${hasProblem ? T.neg : hasChanged ? T.blue : T.bd}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Problem Indicator */}
                {hasProblem && (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: T.neg, color: '#FFF', padding: '0.25rem 0.5rem', fontSize: '0.65rem', fontWeight: 'bold' }}>
                    ⚠️ Problem
                  </div>
                )}

                {/* Label + Description */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.txt, marginBottom: '0.15rem' }}>
                    {label?.name || key}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: T.txt2, lineHeight: '1.2' }}>
                    {label?.desc || ''}
                  </div>
                </div>

                {/* Big Color Display */}
                <div
                  style={{
                    width: '100%',
                    height: '70px',
                    background: value,
                    borderRadius: '6px',
                    marginBottom: '0.75rem',
                    border: `2px solid ${T.bd}`,
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-start',
                    padding: '0.5rem',
                    overflow: 'hidden',
                  }}
                  onClick={() => document.getElementById(`color-${key}`)?.click()}
                  title="Klick zum Öffnen"
                >
                  <input
                    id={`color-${key}`}
                    type="color"
                    value={value}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      border: 'none',
                      position: 'absolute',
                      opacity: 0,
                      left: 0,
                      top: 0,
                    }}
                  />
                  {/* Hex-Text over Color */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#FFF',
                    padding: '0.25rem 0.4rem',
                    borderRadius: '3px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}>
                    {value}
                  </span>
                </div>

                {/* Hex Input + Reset */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    placeholder="#000000"
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      background: T.bg,
                      color: T.txt,
                      border: `1px solid ${T.bd}`,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                    }}
                  />
                  {hasChanged && (
                    <button
                      onClick={() => handleResetColor(key)}
                      style={{
                        padding: '0.4rem 0.6rem',
                        background: 'transparent',
                        color: T.txt2,
                        border: `1px solid ${T.bd}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                      title="Diese Farbe zurücksetzen"
                    >
                      ↺
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Export Code */}
        <div style={{ background: T.surf, border: `2px solid ${T.bd}`, borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 700 }}>📋 Code exportieren</h3>
          <textarea
            readOnly
            value={generateExportCode()}
            style={{
              width: '100%',
              height: '150px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              padding: '0.75rem',
              background: '#1a1a1a',
              color: '#e0e0e0',
              border: `2px solid ${T.bd}`,
              borderRadius: '6px',
              marginBottom: '0.75rem',
              lineHeight: '1.4',
            }}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(generateExportCode());
              alert('✅ Code kopiert!');
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: T.pos,
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            ✅ In Zwischenablage kopieren
          </button>
        </div>
      </div>
    </div>
  );
}
