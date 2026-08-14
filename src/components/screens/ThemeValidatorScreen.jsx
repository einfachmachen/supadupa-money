import { useState, useMemo, useRef } from 'react';
import { THEMES } from '../../theme/themes.js';
import { validateTheme } from '../../theme/validateTheme.js';
import { theme as T } from '../../theme/activeTheme.js';

const getContrastRatio = (color1, color2) => {
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

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

const colorLabels = {
  bg: { name: 'Haupthintergrund', desc: 'App-Hintergrund' },
  surf: { name: 'Kartenfläche', desc: 'Cards, Dialoge' },
  txt: { name: 'Primärtext', desc: 'Haupttext' },
  txt2: { name: 'Sekundärtext', desc: 'Labels, Hinweise' },
  blue: { name: 'Akzentfarbe', desc: 'Links, Buttons' },
  pos: { name: 'Erfolg', desc: 'Positiv' },
  neg: { name: 'Fehler', desc: 'Negativ' },
  gold: { name: 'Warnung', desc: 'Info' },
  bd: { name: 'Rahmen', desc: 'Borders' },
};

// Color swatches preview - shows ALL color combinations
function ColorCombinationsPreview({ theme, onColorClick }) {
  const pairs = [
    { bg: 'bg', fg: 'txt', label: 'Haupttext' },
    { bg: 'bg', fg: 'txt2', label: 'Sekundärtext' },
    { bg: 'bg', fg: 'blue', label: 'Links/Akzent' },
    { bg: 'bg', fg: 'pos', label: 'Erfolg' },
    { bg: 'bg', fg: 'neg', label: 'Fehler' },
    { bg: 'bg', fg: 'gold', label: 'Warnung' },
    { bg: 'surf', fg: 'txt', label: 'Text auf Karte' },
    { bg: 'surf', fg: 'txt2', label: 'Hint auf Karte' },
    { bg: 'surf', fg: 'blue', label: 'Button auf Karte' },
  ];

  return (
    <div style={{ background: theme.bg, color: theme.txt, minHeight: '100vh', padding: '1rem', overflowY: 'auto' }}>
      <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem' }}>SupaDupa Money</h2>

      <h3 style={{ fontSize: '0.9rem', color: theme.txt2, marginTop: '0 0 1rem 0', marginBottom: '1rem' }}>
        Farbkombinationen (Klick zum Bearbeiten)
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {pairs.map((pair, i) => {
          const bgColor = theme[pair.bg];
          const fgColor = theme[pair.fg];
          const contrast = getContrastRatio(bgColor, fgColor);
          const isGood = contrast >= 4.5;

          return (
            <div
              key={i}
              style={{
                background: bgColor,
                padding: '1rem',
                borderRadius: '6px',
                border: `2px solid ${contrast < 3 ? theme.neg : contrast < 4.5 ? theme.gold : 'transparent'}`,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onClick={() => onColorClick(pair.fg)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ color: fgColor, fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                {pair.label}
              </div>
              <div style={{ color: fgColor, fontSize: '0.75rem', opacity: 0.8 }}>
                {contrast.toFixed(2)}:1 {isGood ? '✓' : contrast >= 3 ? '⚠' : '✕'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full UI Preview */}
      <h3 style={{ fontSize: '0.9rem', color: theme.txt2, marginTop: '2rem', marginBottom: '1rem' }}>
        Volle Vorschau
      </h3>

      <div style={{ background: theme.surf, padding: '1rem', borderRadius: '8px', border: `1px solid ${theme.bd}` }}>
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: theme.txt }}>Buttons</h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              style={{
                padding: '0.6rem 1.2rem',
                background: theme.blue,
                color: '#FFF',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Primär
            </button>
            <button
              style={{
                padding: '0.6rem 1.2rem',
                background: theme.pos,
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Erfolg
            </button>
            <button
              style={{
                padding: '0.6rem 1.2rem',
                background: theme.neg,
                color: '#FFF',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Löschen
            </button>
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 0.75rem 0', color: theme.txt }}>Status-Boxen</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div
              style={{
                background: `${theme.pos}22`,
                border: `2px solid ${theme.pos}`,
                color: theme.txt,
                padding: '0.75rem',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            >
              ✅ Erfolg
            </div>
            <div
              style={{
                background: `${theme.gold}22`,
                border: `2px solid ${theme.gold}`,
                color: theme.txt,
                padding: '0.75rem',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            >
              ⚠️ Warnung
            </div>
            <div
              style={{
                background: `${theme.neg}22`,
                border: `2px solid ${theme.neg}`,
                color: theme.txt,
                padding: '0.75rem',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            >
              ❌ Fehler
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemeValidatorScreen({ onThemeChange }) {
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [editedTheme, setEditedTheme] = useState(THEMES[selectedTheme]);
  const [editingColor, setEditingColor] = useState(null);
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

  const handleSelectTheme = (themeName) => {
    const newTheme = THEMES[themeName];
    setSelectedTheme(themeName);
    setEditedTheme(newTheme);
    originalThemeRef.current = newTheme;
    handleThemeChange(newTheme);
    setEditingColor(null);
  };

  const handleResetAll = () => {
    const originalTheme = THEMES[selectedTheme];
    setEditedTheme(originalTheme);
    handleThemeChange(originalTheme);
    setEditingColor(null);
  };

  const handleResetColor = (colorKey) => {
    const newTheme = { ...editedTheme, [colorKey]: originalThemeRef.current[colorKey] };
    handleThemeChange(newTheme);
  };

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
      {/* LEFT: Color Combinations Preview */}
      <div style={{ flex: '1 1 65%', borderRight: `2px solid ${T.bd}`, background: theme.bg }}>
        <ColorCombinationsPreview theme={theme} onColorClick={setEditingColor} />
      </div>

      {/* RIGHT: Compact Controls */}
      <div style={{ flex: '1 1 35%', overflowY: 'auto', padding: '1.5rem', background: T.bg, color: T.txt, display: 'flex', flexDirection: 'column' }}>
        {/* Theme Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: T.txt2, textTransform: 'uppercase' }}>
            Theme:
          </label>
          <select
            value={selectedTheme}
            onChange={(e) => handleSelectTheme(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              background: T.surf,
              color: T.txt,
              border: `1px solid ${T.bd}`,
              borderRadius: '4px',
              fontSize: '0.9rem',
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

        {/* Reset All Button */}
        <button
          onClick={handleResetAll}
          style={{
            width: '100%',
            padding: '0.6rem',
            background: T.surf,
            color: T.txt,
            border: `1px solid ${T.bd}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          🔄 Alle zurücksetzen
        </button>

        {/* Validation Status */}
        {suggestions.length > 0 ? (
          <div style={{ background: T.surf, border: `1px solid ${T.neg}`, borderRadius: '4px', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
            <div style={{ color: T.neg, fontWeight: 'bold', marginBottom: '0.5rem' }}>
              ⚠️ {suggestions.length} Problem{suggestions.length !== 1 ? 'e' : ''}
            </div>
            {suggestions.slice(0, 2).map((s, i) => {
              const contrast = getContrastRatio(theme[s.label.split(' + ')[0].toLowerCase()], s.current);
              return (
                <div key={i} style={{ fontSize: '0.7rem', color: T.txt2, marginBottom: '0.3rem' }}>
                  • {s.label.split(' + ')[1]} ({contrast.toFixed(2)}:1)
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: T.pos, color: '#000', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }}>
            ✅ Kontrast OK
          </div>
        )}

        {/* Compact Color List */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: T.txt2, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Farben
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {Object.entries(theme).map(([key, value]) => {
              if (typeof value !== 'string' || !value.startsWith('#')) return null;
              const label = colorLabels[key];
              const hasChanged = originalThemeRef.current[key] !== value;

              return (
                <div
                  key={key}
                  style={{
                    background: T.surf,
                    border: `2px solid ${editingColor === key ? T.blue : hasChanged ? '#666' : T.bd}`,
                    borderRadius: '4px',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                    transform: editingColor === key ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onClick={() => setEditingColor(editingColor === key ? null : key)}
                  onMouseEnter={(e) => {
                    if (!editingColor) {
                      e.currentTarget.style.background = T.bd;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!editingColor) {
                      e.currentTarget.style.background = T.surf;
                    }
                  }}
                  title={`${label?.name || key}\n${label?.desc || ''}`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '40px',
                      background: value,
                      borderRadius: '2px',
                      marginBottom: '0.4rem',
                      border: `1px solid ${T.bd}`,
                    }}
                  />
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, color: T.txt, textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.2' }}>
                    {label?.name.substring(0, 8) || key}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: T.txt2, textAlign: 'center', fontFamily: 'monospace' }}>
                    {value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Color Editor (if selected) */}
        {editingColor && (
          <div style={{ background: T.surf, border: `2px solid ${T.blue}`, borderRadius: '4px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: T.txt }}>
                  {colorLabels[editingColor]?.name || editingColor}
                </div>
                <div style={{ fontSize: '0.75rem', color: T.txt2 }}>
                  {colorLabels[editingColor]?.desc || ''}
                </div>
              </div>
            </div>

            <input
              type="color"
              value={theme[editingColor]}
              onChange={(e) => handleColorChange(editingColor, e.target.value)}
              style={{
                width: '100%',
                height: '60px',
                border: `2px solid ${T.bd}`,
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '0.75rem',
              }}
            />

            <input
              type="text"
              value={theme[editingColor]}
              onChange={(e) => handleColorChange(editingColor, e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: T.bg,
                color: T.txt,
                border: `1px solid ${T.bd}`,
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {originalThemeRef.current[editingColor] !== theme[editingColor] && (
                <button
                  onClick={() => {
                    handleResetColor(editingColor);
                    setEditingColor(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: T.surf,
                    color: T.txt,
                    border: `1px solid ${T.bd}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  ↺ Zurück
                </button>
              )}
              <button
                onClick={() => setEditingColor(null)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: T.bd,
                  color: T.txt,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                ✓ Fertig
              </button>
            </div>
          </div>
        )}

        {/* Export */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ background: T.surf, border: `1px solid ${T.bd}`, borderRadius: '4px', padding: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: T.txt2, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Export
            </div>
            <textarea
              readOnly
              value={generateExportCode()}
              style={{
                width: '100%',
                height: '100px',
                fontFamily: 'monospace',
                fontSize: '0.65rem',
                padding: '0.5rem',
                background: '#1a1a1a',
                color: '#e0e0e0',
                border: `1px solid ${T.bd}`,
                borderRadius: '3px',
                marginBottom: '0.5rem',
                lineHeight: '1.3',
              }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateExportCode());
                alert('✅ Code kopiert!');
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: T.pos,
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.8rem',
              }}
            >
              ✓ Kopieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
