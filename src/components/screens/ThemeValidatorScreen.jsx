import { useState, useMemo, useRef } from 'react';
import { THEMES } from '../../theme/themes.js';
import { validateTheme } from '../../theme/validateTheme.js';
import { theme as T } from '../../theme/activeTheme.js';

const getContrastRatio = (color1, color2) => {
  // Ignoriere rgba/rgb Farben (können nicht validiert werden)
  if (color1?.includes('rgba') || color1?.includes('rgb(') || color2?.includes('rgba') || color2?.includes('rgb(')) {
    return null;
  }

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
  bg: 'Haupthintergrund',
  surf: 'Kartenfläche',
  surf2: 'Kartenfläche 2',
  surf3: 'Kartenfläche 3',
  txt: 'Primärtext',
  txt2: 'Sekundärtext',
  blue: 'Akzentfarbe',
  pos: 'Erfolg',
  neg: 'Fehler',
  gold: 'Warnung',
  bd: 'Rahmen',
  bds: 'Rahmen stark',
  mid: 'Mitte',
  cf: 'Kategorie-Farbe',
  on_accent: 'Text auf Akzent',
  disabled: 'Deaktiviert',
};

// Erzeuge alle wichtigen Farbkombinationen aus der aktuellen Theme
function generateAllPairs(theme) {
  const backgrounds = ['bg', 'surf', 'surf2', 'surf3'];
  const foregrounds = ['txt', 'txt2', 'blue', 'pos', 'neg', 'gold', 'bd', 'mid', 'cf', 'on_accent'];

  const pairs = [];

  // Alle möglichen Kombinationen
  backgrounds.forEach(bg => {
    if (!theme[bg]) return;
    foregrounds.forEach(fg => {
      if (!theme[fg]) return;
      const bgColor = theme[bg];
      const fgColor = theme[fg];

      // Ignoriere rgba/rgb
      if (bgColor?.includes('rgba') || bgColor?.includes('rgb(')) return;
      if (fgColor?.includes('rgba') || fgColor?.includes('rgb(')) return;

      pairs.push({
        bg,
        fg,
        label: `${colorLabels[fg]} auf ${colorLabels[bg]}`,
      });
    });
  });

  return pairs;
};

function ColorEditor({ colorKey, currentValue, label, onClose, onChange, onReset, hasChanged }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.surf,
          padding: '1.5rem',
          borderRadius: '8px',
          border: `2px solid ${T.blue}`,
          minWidth: '280px',
          maxWidth: '400px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: T.txt, fontSize: '1.1rem' }}>
            {label || colorKey}
          </h3>
          <div style={{ fontSize: '0.8rem', color: T.txt2, marginTop: '0.25rem' }}>
            Hex-Wert bearbeiten
          </div>
        </div>

        <input
          type="color"
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            height: '80px',
            border: `2px solid ${T.bd}`,
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        />

        <input
          type="text"
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: T.bg,
            color: T.txt,
            border: `1px solid ${T.bd}`,
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            marginBottom: '1rem',
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {hasChanged && (
            <button
              onClick={onReset}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: T.surf,
                color: T.txt,
                border: `1px solid ${T.bd}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ↺ Zurück
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: T.blue,
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✓ OK
          </button>
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
  const { suggestions } = useMemo(
    () => validateTheme(theme.name || selectedTheme, theme),
    [theme, selectedTheme]
  );

  const colorProblems = new Set();
  suggestions.forEach((sug) => {
    const colorKey = sug.label.split(' + ')[1]?.split(' ')[0]?.toLowerCase();
    if (colorKey) colorProblems.add(colorKey);
  });

  const handleColorChange = (value) => {
    const newTheme = { ...editedTheme, [editingColor]: value };
    setEditedTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  const handleResetColor = () => {
    const newTheme = { ...editedTheme, [editingColor]: originalThemeRef.current[editingColor] };
    setEditedTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  const handleSelectTheme = (themeName) => {
    const newTheme = THEMES[themeName];
    setSelectedTheme(themeName);
    setEditedTheme(newTheme);
    originalThemeRef.current = newTheme;
    onThemeChange?.(newTheme);
    setEditingColor(null);
  };

  const handleResetAll = () => {
    const originalTheme = THEMES[selectedTheme];
    setEditedTheme(originalTheme);
    onThemeChange?.(originalTheme);
    setEditingColor(null);
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

  // Dynamisch: Alle echten Farbkombinationen aus dem Theme
  const pairs = useMemo(() => generateAllPairs(theme), [theme]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bg }}>
      {/* Header Bar - Compact */}
      <div
        style={{
          background: theme.surf,
          borderBottom: `1px solid ${theme.bd}`,
          padding: '0.6rem 0.8rem',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'center',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <select
          value={selectedTheme}
          onChange={(e) => handleSelectTheme(e.target.value)}
          style={{
            padding: '0.4rem 0.5rem',
            background: theme.bg,
            color: theme.txt,
            border: `1px solid ${theme.bd}`,
            borderRadius: '3px',
            fontSize: '0.85rem',
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

        <button
          onClick={handleResetAll}
          style={{
            padding: '0.4rem 0.8rem',
            background: theme.bg,
            color: theme.txt,
            border: `1px solid ${theme.bd}`,
            borderRadius: '3px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
          }}
        >
          🔄 Reset
        </button>

        {suggestions.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: theme.neg, fontWeight: 'bold' }}>
            ⚠️ {suggestions.length}
          </div>
        )}

        {suggestions.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: theme.pos, fontWeight: 'bold' }}>
            ✅ OK
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.8rem', background: theme.bg, color: theme.txt }}>
        <h2 style={{ margin: '0 0 0.8rem 0', fontSize: '1.2rem' }}>SupaDupa Money</h2>

        {/* Clickable Color Combinations Grid - Grouped by Background */}
        {['bg', 'surf', 'surf2', 'surf3'].map(bgKey => {
          const bgPairs = pairs.filter(p => p.bg === bgKey);
          if (bgPairs.length === 0) return null;

          return (
            <div key={bgKey} style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0.6rem 0 0.4rem 0', color: theme.txt2, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                auf {colorLabels[bgKey] || bgKey}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {bgPairs.map((pair, i) => {
                  const bgColor = theme[pair.bg];
                  const fgColor = theme[pair.fg];
                  const contrast = getContrastRatio(bgColor, fgColor);
                  const isGood = contrast && contrast >= 4.5;
                  const hasProblem = colorProblems.has(pair.fg);

                  // Ignoriere rgba Kombinationen
                  if (contrast === null) return null;

                  return (
                    <div
                      key={i}
                      onClick={() => setEditingColor(pair.fg)}
                      style={{
                        background: bgColor,
                        padding: '0.7rem',
                        borderRadius: '5px',
                        border: `2px solid ${hasProblem ? theme.neg : contrast < 4.5 ? theme.gold : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        transform: 'scale(1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ color: fgColor, fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                        {colorLabels[pair.fg] || pair.fg}
                      </div>
                      <div style={{ color: fgColor, fontSize: '0.7rem', opacity: 0.85 }}>
                        {contrast.toFixed(2)}:1
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Full UI Preview - alle Farben */}
        <h3 style={{ fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.6rem', color: theme.txt2 }}>Alle Farben</h3>

        <div style={{ background: theme.surf, padding: '0.8rem', borderRadius: '6px', border: `1px solid ${theme.bd}` }}>
          {/* Buttons */}
          {(theme.blue || theme.pos || theme.neg || theme.gold) && (
            <div style={{ marginBottom: '0.8rem' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', color: theme.txt, fontSize: '0.8rem', fontWeight: 600 }}>Buttons</h4>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {theme.blue && (
                  <button
                    onClick={() => setEditingColor('blue')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: theme.blue,
                      color: getContrastRatio(theme.blue, '#FFF') > 1.5 ? '#FFF' : '#000',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    Primär
                  </button>
                )}
                {theme.pos && (
                  <button
                    onClick={() => setEditingColor('pos')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: theme.pos,
                      color: getContrastRatio(theme.pos, '#FFF') > 1.5 ? '#FFF' : '#000',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    ✅
                  </button>
                )}
                {theme.neg && (
                  <button
                    onClick={() => setEditingColor('neg')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: theme.neg,
                      color: getContrastRatio(theme.neg, '#FFF') > 1.5 ? '#FFF' : '#000',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    ❌
                  </button>
                )}
                {theme.gold && (
                  <button
                    onClick={() => setEditingColor('gold')}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: theme.gold,
                      color: getContrastRatio(theme.gold, '#FFF') > 1.5 ? '#FFF' : '#000',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Farb-Palette */}
          <div>
            <h4 style={{ margin: '0 0 0.4rem 0', color: theme.txt, fontSize: '0.8rem', fontWeight: 600 }}>Palette</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '0.4rem' }}>
              {Object.entries({ txt: theme.txt, txt2: theme.txt2, blue: theme.blue, pos: theme.pos, neg: theme.neg, gold: theme.gold, bd: theme.bd, mid: theme.mid }).map(
                ([key, color]) => {
                  if (!color || color.includes('rgba') || color.includes('rgb(')) return null;
                  return (
                    <div
                      key={key}
                      onClick={() => setEditingColor(key)}
                      style={{
                        background: color,
                        padding: '0.4rem',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        color: getContrastRatio(color, '#FFF') > 1.5 ? '#FFF' : '#000',
                        textAlign: 'center',
                        fontWeight: 600,
                        border: `1px solid ${theme.bd}`,
                      }}
                      title={`Klick: ${key}`}
                    >
                      {key}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Export */}
        <div style={{ marginTop: '0.8rem', background: theme.surf, padding: '0.8rem', borderRadius: '6px', border: `1px solid ${theme.bd}` }}>
          <h4 style={{ margin: '0 0 0.4rem 0', color: theme.txt, fontSize: '0.85rem' }}>📋 Export</h4>
          <textarea
            readOnly
            value={generateExportCode()}
            style={{
              width: '100%',
              height: '80px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              padding: '0.5rem',
              background: '#1a1a1a',
              color: '#e0e0e0',
              border: `1px solid ${theme.bd}`,
              borderRadius: '3px',
              marginBottom: '0.5rem',
              lineHeight: '1.3',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(generateExportCode());
              alert('✅ Kopiert!');
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: theme.pos,
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

      {/* Color Editor Modal */}
      {editingColor && (
        <ColorEditor
          colorKey={editingColor}
          currentValue={theme[editingColor]}
          label={colorLabels[editingColor]}
          onClose={() => setEditingColor(null)}
          onChange={handleColorChange}
          onReset={handleResetColor}
          hasChanged={originalThemeRef.current[editingColor] !== theme[editingColor]}
        />
      )}
    </div>
  );
}
