// Hilfe-Assistent: Schritt-für-Schritt-Anleitung, wie ein Nutzer sich selbst
// per Enable Banking mit seinem echten Bankkonto verbindet.
//
// Reiner Erklär-/Onboarding-Screen ("an die Hand nehmen") — mehrseitig, je
// Seite kurz und prägnant. Stil orientiert sich an den übrigen Vollbild-
// Screens (siehe MobileActionPicker / CsvImportScreen): position:fixed,
// Header mit Zurück-Pfeil, scrollbarer Inhalt, Fuß-Navigation.

import React, { useState } from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";

// Kleines farbiges Hinweis-Kästchen (Tipp / Warnung / Info)
function Callout({ tone = "info", icon, children }) {
  const map = {
    info: T.blue,
    tip:  T.pos,
    warn: T.gold,
    danger: T.neg,
  };
  const c = map[tone] || T.blue;
  return (
    <div style={{
      display:"flex", gap:10, alignItems:"flex-start",
      background:c+"18", border:`1px solid ${c}55`, borderRadius:12,
      padding:"10px 12px", marginTop:14,
    }}>
      <div style={{flexShrink:0, marginTop:1}}>{Li(icon||"info", 18, c)}</div>
      <div style={{color:T.txt, fontSize:13.5, lineHeight:1.5}}>{children}</div>
    </div>
  );
}

// Nummerierte Schrittliste
function Steps({ items }) {
  return (
    <div style={{display:"flex", flexDirection:"column", gap:10, marginTop:6}}>
      {items.map((it, i) => (
        <div key={i} style={{display:"flex", gap:11, alignItems:"flex-start"}}>
          <div style={{
            flexShrink:0, width:24, height:24, borderRadius:12,
            background:T.blue+"22", color:T.blue, fontSize:13, fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>{i+1}</div>
          <div style={{color:T.txt, fontSize:14.5, lineHeight:1.5, paddingTop:1}}>{it}</div>
        </div>
      ))}
    </div>
  );
}

// Externer-Link-Button (öffnet enablebanking.com etc. in neuem Tab)
function LinkBtn({ href, label }) {
  return (
    <button onClick={()=>{ try { window.open(href, "_blank", "noopener,noreferrer"); } catch(e){} }}
      style={{
        display:"inline-flex", alignItems:"center", gap:8, marginTop:14,
        background:T.blue+"1F", border:`1px solid ${T.blue}66`, color:T.blue,
        borderRadius:11, padding:"9px 13px", fontSize:14, fontWeight:700,
        cursor:"pointer", fontFamily:"inherit",
      }}>
      {Li("link", 16, T.blue)}
      {label}
    </button>
  );
}

function EnableBankingGuide({ onClose, onBack }) {
  // ── Seiteninhalte (so viele wie nötig, je Seite kompakt) ───────────────────
  const pages = [
    {
      icon: "landmark", color: T.pos,
      title: "Echte Umsätze automatisch",
      lead: "Statt CSV-Dateien zu exportieren, holst du deine Bankumsätze direkt — über deinen eigenen, kostenlosen Zugang bei Enable Banking.",
      body: (
        <>
          <Steps items={[
            "Komplett kostenlos für dich.",
            "Dein Bank-Login bleibt bei deiner Bank — wir sehen ihn nie.",
            "Einmalige Einrichtung, danach nur noch „Aktualisieren“.",
          ]}/>
          <Callout tone="info" icon="info">
            Funktioniert aktuell mit Banken in <b>EU & UK</b>. Die Einrichtung
            dauert einmalig ca. 10 Minuten.
          </Callout>
        </>
      ),
    },
    {
      icon: "plus-circle", color: T.blue,
      title: "Schritt 1 — Konto bei Enable Banking",
      lead: "Enable Banking ist der Dienst, der die regulierte Verbindung zu deiner Bank herstellt. Du legst dort ein kostenloses Konto an.",
      body: (
        <>
          <Steps items={[
            "Öffne enablebanking.com und registriere dich kostenlos.",
            "Bestätige deine E-Mail-Adresse.",
            "Melde dich im Portal an.",
          ]}/>
          <LinkBtn href="https://enablebanking.com" label="enablebanking.com öffnen"/>
        </>
      ),
    },
    {
      icon: "lock", color: T.gold,
      title: "Schritt 2 — App anlegen & Schlüssel sichern",
      lead: "Im Portal registrierst du eine „Application“. Dabei erzeugt dein Browser einen privaten Schlüssel als Datei.",
      body: (
        <>
          <Steps items={[
            "Im Portal „Applications“ → neue Application anlegen.",
            "Als Redirect-URL die Adresse dieser App eintragen.",
            "Die heruntergeladene Schlüssel-Datei (…​.pem) sicher speichern.",
            "Notiere dir die angezeigte Application-ID.",
          ]}/>
          <Callout tone="danger" icon="alert-triangle">
            Der <b>.pem-Schlüssel</b> ist dein privater Zugang — wie ein Passwort.
            Bewahre ihn sicher auf (z. B. Passwort-Manager) und gib ihn niemandem weiter.
          </Callout>
        </>
      ),
    },
    {
      icon: "list", color: T.pos,
      title: "Schritt 3 — Eigene Konten freischalten",
      lead: "Im kostenlosen Modus erlaubt Enable Banking nur Konten, die du selbst ausdrücklich freischaltest („Restricted Production“).",
      body: (
        <>
          <Steps items={[
            "Im Portal deine Bank auswählen.",
            "Die Konten freischalten, die du in SupaDupa sehen willst.",
            "Freigabe speichern.",
          ]}/>
          <Callout tone="warn" icon="alert-triangle">
            Ohne diesen Schritt werden später <b>keine Konten</b> gefunden. Genau
            das macht den Zugang gratis und auf deine eigenen Konten beschränkt.
          </Callout>
        </>
      ),
    },
    {
      icon: "edit", color: T.blue,
      title: "Schritt 4 — In SupaDupa hinterlegen",
      lead: "Jetzt verbindest du SupaDupa mit deinem Zugang. Die Daten bleiben nur lokal auf deinem Gerät gespeichert.",
      body: (
        <>
          <Steps items={[
            "Application-ID aus dem Portal eingeben.",
            "Die .pem-Schlüssel-Datei auswählen.",
            "Speichern — fertig hinterlegt.",
          ]}/>
          <Callout tone="tip" icon="lock">
            ID und Schlüssel werden <b>nur auf deinem Gerät</b> gespeichert (wie
            deine übrigen App-Daten) — nicht auf einem zentralen Server.
          </Callout>
        </>
      ),
    },
    {
      icon: "link", color: T.gold,
      title: "Schritt 5 — Konto verbinden & freigeben",
      lead: "Beim Verbinden leitet dich die App zu deiner Bank weiter. Dort gibst du den Zugriff wie gewohnt frei.",
      body: (
        <>
          <Steps items={[
            "„Konto verbinden“ antippen.",
            "Du wirst zur Login-Seite deiner Bank geleitet.",
            "Mit TAN / Banking-App freigeben.",
            "Zurück in SupaDupa werden deine Umsätze importiert.",
          ]}/>
          <Callout tone="info" icon="info">
            Dein Passwort gibst du <b>nur bei deiner Bank</b> ein — SupaDupa
            bekommt es nie zu sehen.
          </Callout>
        </>
      ),
    },
    {
      icon: "refresh-cw", color: T.pos,
      title: "Schritt 6 — Aktualisieren & 90-Tage-Regel",
      lead: "Ab jetzt holst du neue Umsätze mit einem Tipp. Eine gesetzliche Regel verlangt nur ab und zu eine erneute Freigabe.",
      body: (
        <>
          <Steps items={[
            "Button „Aktualisieren“ holt neue Umsätze.",
            "Alle ~90 Tage einmal erneut bei der Bank freigeben (PSD2-Pflicht).",
          ]}/>
          <Callout tone="tip" icon="check-circle">
            Das Tageslimit für automatische Abrufe ist für einen Finanztracker
            ohne Bedeutung — manuelles Aktualisieren reicht völlig.
          </Callout>
        </>
      ),
    },
    {
      icon: "shield", color: T.blue,
      title: "Gut zu wissen",
      lead: "Das Wichtigste zu Kosten und Datenschutz auf einen Blick.",
      body: (
        <>
          <Steps items={[
            "Kostenlos — für deine eigenen Konten fallen keine Gebühren an.",
            "Kein Bank-Login bei uns gespeichert.",
            "Enable Banking sieht die Umsätze technisch im Durchlauf — das ist bei jedem Open-Banking-Anbieter so.",
          ]}/>
          <Callout tone="info" icon="star">
            Geschafft! Du kennst jetzt alle Schritte, um deinen eigenen Zugang
            einzurichten.
          </Callout>
        </>
      ),
    },
  ];

  const [page, setPage] = useState(0);
  const last = pages.length - 1;
  const p = pages[page];
  const goBack  = () => { if(page>0) setPage(page-1); else (onBack||onClose)?.(); };
  const goNext  = () => { if(page<last) setPage(page+1); else onClose?.(); };

  return (
    <div style={{position:"fixed", inset:0, background:T.bg, zIndex:320,
      display:"flex", flexDirection:"column"}}>

      {/* Header */}
      <div style={{background:T.surf, borderBottom:`1px solid ${T.bd}`,
        padding:"calc(12px + env(safe-area-inset-top, 0px)) 16px 12px",
        display:"flex", alignItems:"center", gap:12, flexShrink:0}}>
        <button onClick={goBack}
          style={{background:"rgba(255,255,255,0.08)", border:"none", color:T.txt2,
            width:44, height:44, borderRadius:14, cursor:"pointer", fontSize:20,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
          {page>0 ? Li("arrow-left",22,T.txt) : "✕"}
        </button>
        <div style={{flex:1, minWidth:0}}>
          <div style={{color:T.txt, fontSize:20, fontWeight:700}}>Bank verbinden</div>
          <div style={{color:T.txt2, fontSize:12, marginTop:2}}>
            Schritt {page+1} von {pages.length} · Enable Banking
          </div>
        </div>
        <button onClick={onClose}
          style={{background:"transparent", border:"none", color:T.txt2,
            fontSize:13, fontWeight:700, cursor:"pointer", padding:"6px 4px", flexShrink:0}}>
          Schließen
        </button>
      </div>

      {/* Fortschrittsbalken */}
      <div style={{height:3, background:T.bd, flexShrink:0}}>
        <div style={{height:"100%", width:`${((page+1)/pages.length)*100}%`,
          background:T.blue, transition:"width 0.25s ease"}}/>
      </div>

      {/* Inhalt */}
      <div style={{flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch",
        padding:"22px 18px 18px"}}>
        <div style={{maxWidth:480, margin:"0 auto"}}>
          <div style={{width:54, height:54, borderRadius:16, background:p.color+"22",
            display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16}}>
            {Li(p.icon, 28, p.color)}
          </div>
          <div style={{color:T.txt, fontSize:23, fontWeight:800, lineHeight:1.25}}>{p.title}</div>
          <div style={{color:T.txt2, fontSize:15, lineHeight:1.55, marginTop:10, marginBottom:18}}>
            {p.lead}
          </div>
          {p.body}
        </div>
      </div>

      {/* Fuß-Navigation */}
      <div style={{flexShrink:0, borderTop:`1px solid ${T.bd}`, background:T.surf,
        padding:"12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
        display:"flex", alignItems:"center", gap:10}}>
        {/* Punkte */}
        <div style={{display:"flex", gap:6, flex:1, flexWrap:"wrap"}}>
          {pages.map((_, i)=>(
            <button key={i} onClick={()=>setPage(i)} aria-label={`Schritt ${i+1}`}
              style={{width:8, height:8, borderRadius:4, padding:0, border:"none", cursor:"pointer",
                background: i===page ? T.blue : T.bds}}/>
          ))}
        </div>
        {page>0 && (
          <button onClick={goBack}
            style={{background:"rgba(255,255,255,0.06)", border:`1px solid ${T.bd}`,
              color:T.txt, borderRadius:13, padding:"10px 16px", fontSize:15, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit"}}>
            Zurück
          </button>
        )}
        <button onClick={goNext}
          style={{background:T.blue, border:"none", color:T.on_accent, borderRadius:13,
            padding:"10px 20px", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"inherit"}}>
          {page<last ? "Weiter" : "Fertig"}
        </button>
      </div>
    </div>
  );
}

export { EnableBankingGuide };
