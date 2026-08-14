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
  bg: 'Haupthintergrund',
  surf: 'Kartenfläche',
  txt: 'Primärtext',
  txt2: 'Sekundärtext',
  blue: 'Akzentfarbe',
  pos: 'Erfolg',
  neg: 'Fehler',
  gold: 'Warnung',
  bd: 'Rahmen',
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

  // Clickable color combinations with inline editing
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

        {/* Clickable Color Combinations Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem', marginBottom: '1.2rem' }}>
          {pairs.map((pair, i) => {
            const bgColor = theme[pair.bg];
            const fgColor = theme[pair.fg];
            const contrast = getContrastRatio(bgColor, fgColor);
            const isGood = contrast >= 4.5;
            const hasProblem = colorProblems.has(pair.fg);

            return (
              <div
                key={i}
                onClick={() => setEditingColor(pair.fg)}
                style={{
                  background: bgColor,
                  padding: '0.8rem',
                  borderRadius: '6px',
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
                <div style={{ color: fgColor, fontWeight: 'bold', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                  {pair.label}
                </div>
                <div style={{ color: fgColor, fontSize: '0.75rem', opacity: 0.85 }}>
                  {contrast.toFixed(2)}:1
                </div>
              </div>
            );
          })}
        </div>

        {/* Full UI Preview */}
        <h3 style={{ fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.6rem', color: theme.txt2 }}>Vorschau</h3>

        <div style={{ background: theme.surf, padding: '0.8rem', borderRadius: '6px', border: `1px solid ${theme.bd}` }}>
          <div style={{ marginBottom: '0.8rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: theme.txt, fontSize: '0.85rem' }}>Buttons</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setEditingColor('blue')}
                style={{
                  padding: '0.5rem 1rem',
                  background: theme.blue,
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
                title="Klick zum Bearbeiten (blue)"
              >
                Primär
              </button>
              <button
                onClick={() => setEditingColor('pos')}
                style={{
                  padding: '0.5rem 1rem',
                  background: theme.pos,
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
                title="Klick zum Bearbeiten (pos)"
              >
                ✅ Erfolg
              </button>
              <button
                onClick={() => setEditingColor('neg')}
                style={{
                  padding: '0.5rem 1rem',
                  background: theme.neg,
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
                title="Klick zum Bearbeiten (neg)"
              >
                ❌ Fehler
              </button>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: theme.txt, fontSize: '0.85rem' }}>Status</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                style={{
                  background: `${theme.pos}22`,
                  border: `1px solid ${theme.pos}`,
                  color: theme.txt,
                  padding: '0.6rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
                onClick={() => setEditingColor('pos')}
              >
                ✅ Erfolg
              </div>
              <div
                style={{
                  background: `${theme.gold}22`,
                  border: `1px solid ${theme.gold}`,
                  color: theme.txt,
                  padding: '0.6rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
                onClick={() => setEditingColor('gold')}
              >
                ⚠️ Warnung
              </div>
              <div
                style={{
                  background: `${theme.neg}22`,
                  border: `1px solid ${theme.neg}`,
                  color: theme.txt,
                  padding: '0.6rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
                onClick={() => setEditingColor('neg')}
              >
                ❌ Fehler
              </div>
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
