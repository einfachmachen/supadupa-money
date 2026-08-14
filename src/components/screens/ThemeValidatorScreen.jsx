import { useState, useMemo } from 'react';
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

const adjustColorLuminance = (hexColor, percent) => {
  const hex = hexColor.replace('#', '');
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);

  r = Math.min(255, Math.max(0, Math.round(r * (1 + percent))));
  g = Math.min(255, Math.max(0, Math.round(g * (1 + percent))));
  b = Math.min(255, Math.max(0, Math.round(b * (1 + percent))));

  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
};

export default function ThemeValidatorScreen({ onThemeChange }) {
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [editedTheme, setEditedTheme] = useState(THEMES[selectedTheme]);
  const [hoveredColor, setHoveredColor] = useState(null);

  const theme = editedTheme || THEMES[selectedTheme];
  const { issues, suggestions } = useMemo(
    () => validateTheme(theme.name || selectedTheme, theme),
    [theme, selectedTheme]
  );

  const isLight =
    theme.txt === '#000000' ||
    theme.txt === '#1E2418' ||
    (theme.txt && theme.txt.startsWith('#1')) ||
    (theme.txt && theme.txt.startsWith('#2'));

  const criticalPairs = isLight
    ? [
        { bg: 'bg', fg: 'blue', minContrast: 4.5, label: 'Links/Buttons' },
        { bg: 'bg', fg: 'pos', minContrast: 4.5, label: 'Positiv' },
        { bg: 'bg', fg: 'neg', minContrast: 4.5, label: 'Negativ' },
        { bg: 'bg', fg: 'gold', minContrast: 3.0, label: 'Warnungen' },
        { bg: 'surf', fg: 'txt2', minContrast: 4.5, label: 'Sekundärtext' },
      ]
    : [
        { bg: 'bg', fg: 'txt', minContrast: 4.5, label: 'Haupttext' },
        { bg: 'bg', fg: 'txt2', minContrast: 4.5, label: 'Sekundärtext' },
        { bg: 'bg', fg: 'blue', minContrast: 4.5, label: 'Akzent' },
      ];

  const applySuggestion = (suggestion) => {
    const field = suggestion.label.split(' + ')[1].split(' ')[0].toLowerCase();
    const newTheme = {
      ...editedTheme,
      [field]: suggestion.suggested,
    };
    setEditedTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  const handleColorChange = (colorKey, value) => {
    const newTheme = { ...editedTheme, [colorKey]: value };
    setEditedTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  const generateExportCode = () => {
    const theme = editedTheme || THEMES[selectedTheme];
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
    <div style={{ padding: '1.5rem', background: T.bg, color: T.txt, minHeight: '100vh', overflow: 'auto' }}>
      {/* Theme-Auswahl */}
      <div style={{ marginBottom: '2rem', maxWidth: '100%' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: T.txt2, fontSize: '0.9rem', fontWeight: 600 }}>
          Theme wählen:
        </label>
        <select
          value={selectedTheme}
          onChange={(e) => {
            setSelectedTheme(e.target.value);
            const newTheme = THEMES[e.target.value];
            setEditedTheme(newTheme);
            onThemeChange?.(newTheme);
          }}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            background: T.surf,
            color: T.txt,
            border: `2px solid ${T.bd}`,
            borderRadius: '6px',
            width: '100%',
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

      {/* Probleme & Vorschläge */}
      {suggestions.length > 0 ? (
        <div
          style={{
            background: T.surf,
            border: `2px solid ${T.neg}`,
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ color: T.neg, marginTop: 0 }}>⚠️ {suggestions.length} Problem(e)</h2>

          {suggestions.map((sug, idx) => {
            const contrast = getContrastRatio(theme[sug.label.split(' + ')[0].toLowerCase()], sug.current);
            const newContrast = getContrastRatio(theme[sug.label.split(' + ')[0].toLowerCase()], sug.suggested);

            return (
              <div
                key={idx}
                style={{
                  background: T.bg,
                  border: `1px solid ${T.bd}`,
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  onMouseEnter: () => setHoveredColor(idx),
                  onMouseLeave: () => setHoveredColor(null),
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>{sug.label}</strong>
                  <div style={{ fontSize: '0.9rem', color: T.txt2, marginTop: '0.25rem' }}>
                    Kontrast: {contrast.toFixed(2)}:1 → {newContrast.toFixed(2)}:1
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Aktuell */}
                  <div>
                    <div style={{ fontSize: '0.85rem', color: T.txt2 }}>Aktuell:</div>
                    <div
                      style={{
                        background: sug.current,
                        width: '100%',
                        height: '80px',
                        borderRadius: '4px',
                        border: `1px solid ${T.bd}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: contrast > 3 ? '#FFF' : '#000',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {sug.current}
                    </div>
                  </div>

                  {/* Vorschlag */}
                  <div>
                    <div style={{ fontSize: '0.85rem', color: T.txt2 }}>💡 Besser:</div>
                    <div
                      style={{
                        background: sug.suggested,
                        width: '100%',
                        height: '80px',
                        borderRadius: '4px',
                        border: `2px solid ${T.pos}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: newContrast > 3 ? '#FFF' : '#000',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => applySuggestion(sug)}
                      title="Klick zum Übernehmen"
                    >
                      {sug.suggested}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => applySuggestion(sug)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: T.bd,
                    color: T.txt,
                    border: `2px solid ${T.txt}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                  }}
                >
                  ✅ Übernehmen
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            background: T.pos,
            color: '#000',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
          }}
        >
          ✅ Alle Farben haben guten Kontrast!
        </div>
      )}

      {/* Farben direktbearbeiten */}
      {editedTheme && (
        <div
          style={{
            background: T.surf,
            border: `2px solid ${T.bd}`,
            borderRadius: '8px',
            padding: '1.5rem',
            marginTop: '2rem',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>🎨 Farben bearbeiten</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {Object.entries(theme).map(([key, value]) => {
              if (typeof value !== 'string' || !value.startsWith('#')) return null;
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: T.txt2, fontWeight: 600, textTransform: 'uppercase' }}>
                    {key}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      style={{
                        width: '50px',
                        height: '50px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: T.bg,
                        color: T.txt,
                        border: `1px solid ${T.bd}`,
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '30px',
                      background: value,
                      borderRadius: '4px',
                      border: `1px solid ${T.bd}`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export */}
      {editedTheme && (
        <div
          style={{
            background: T.surf,
            border: `2px solid ${T.bd}`,
            borderRadius: '8px',
            padding: '1.5rem',
            marginTop: '2rem',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>📋 Code exportieren</h3>
          <textarea
            readOnly
            value={generateExportCode()}
            style={{
              width: '100%',
              height: '180px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              padding: '1rem',
              background: '#1a1a1a',
              color: '#e0e0e0',
              border: `2px solid ${T.bd}`,
              borderRadius: '6px',
              marginBottom: '1rem',
              lineHeight: '1.5',
            }}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(generateExportCode());
              alert('✅ Code in Zwischenablage kopiert!');
            }}
            style={{
              width: '100%',
              padding: '0.85rem',
              background: T.pos,
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.95rem',
            }}
          >
            ✅ In Zwischenablage kopieren
          </button>
        </div>
      )}
    </div>
  );
}
