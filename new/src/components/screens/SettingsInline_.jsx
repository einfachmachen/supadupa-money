// Auto-generated module (siehe app-src.jsx)

import React, { useContext } from "react";
import { Lbl } from "../atoms/Lbl.jsx";
import { SupaField } from "../atoms/SupaField.jsx";
import { CustomThemeEditor } from "./CustomThemeEditor.jsx";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { INP } from "../../theme/palette.js";
import { THEMES } from "../../theme/themes.js";
import { Li } from "../../utils/icons.jsx";
import { makeYearData } from "../../utils/yearData.js";
import { kvStore } from "../../utils/kvStore.js";

function SettingsInline() {
  const {
    col3Name, setCol3Name,
    accounts, setAccounts, accIconPick, setAccIconPick, moveAcc,
    supaStatus, supaUrl, setSupaUrl, supaKey, setSupaKey, supaLockKey,
    testSupaConnection, saveSupaSettings, supaActive, setSupaStatus, setSupaError, supaError, supaFetch,
    jsonbinActive, jsonbinSave, jsonbinLoad, jsonbinStatus, setJsonbinStatus, jsonbinKey, jsonbinId, setJsonbinKey, setJsonbinId,
    gistActive, gistSave, gistLoad, gistStatus, setGistStatus, gistToken, gistId, setGistToken, setGistId, applyData,
    cfActive, cfSave, cfLoad, cfStatus, setCfStatus, cfUrl, cfSecret, setCfUrl, setCfSecret,
    syncStatus, setSyncStatus, syncError,
    themeName, setThemeName, setThemeRev,
    handedness, setHandedness,
    dashboardVariant, setDashboardVariant,
    confirmReset, setConfirmReset,
    cats, setCats, groups, setGroups, txs, setTxs, yearData, setYearData,
    noBorders, setNoBorders,
  } = useContext(AppCtx);

  return (
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"12px 14px 24px"}}>

      {/* Dashboard-Variante */}
      <div style={{marginBottom:14}}>
        <div style={{color:T.lbl||T.txt2,fontSize:11,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
          {Li("layout",13,T.blue)} Dashboard-Stil
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["v1","Klassisch","Bestehendes Layout"],["v2","Clean","Neue, kompakte Variante"]].map(([key,label,desc])=>(
            <button key={key} onClick={()=>setDashboardVariant(key)}
              style={{flex:1,padding:"10px 8px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",
                border:`2px solid ${dashboardVariant===key?T.blue:T.bd}`,
                background:dashboardVariant===key?T.blue+"22":"transparent",
                color:T.txt,
                display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{fontSize:13,fontWeight:700,color:dashboardVariant===key?T.blue:T.txt}}>{label}</div>
              <div style={{fontSize:10,color:T.lbl||T.txt2,textAlign:"center"}}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme-Auswahl */}
      <div style={{marginBottom:14}}>
        <div style={{color:T.lbl||T.txt2,fontSize:11,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
          {Li("palette",13,T.blue)} Farbschema
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
          {[...Object.entries(THEMES), ...Object.entries(JSON.parse(kvStore.getItem("mbt_custom_themes")||"{}"))
            .filter(([k])=>!THEMES[k])].map(([key,theme])=>(
            <button key={key} onClick={()=>{setThemeName(key);kvStore.setItem("mbt_theme",key);}}
              style={{padding:"8px 4px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",minWidth:0,
                border:`2px solid ${themeName===key?theme.blue:"transparent"}`,
                background:theme.bg,
                boxShadow:themeName===key?`0 0 0 1px ${theme.blue}44`:"none",
                display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
              {/* Mini-Preview */}
              <div style={{width:"100%",borderRadius:8,overflow:"hidden",border:`1px solid ${theme.bds}`}}>
                <div style={{background:theme.surf,padding:"4px 6px",display:"flex",gap:3,alignItems:"center"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:theme.blue}}/>
                  <div style={{height:4,borderRadius:2,background:theme.blue,flex:1,opacity:0.7}}/>
                </div>
                <div style={{background:theme.bg,padding:"4px 6px",display:"flex",flexDirection:"column",gap:2}}>
                  <div style={{height:3,borderRadius:2,background:theme.txt,opacity:0.6,width:"80%"}}/>
                  <div style={{height:3,borderRadius:2,background:theme.txt2,width:"60%"}}/>
                  <div style={{height:3,borderRadius:2,background:theme.pos,width:"40%"}}/>
                </div>
              </div>
              <span style={{fontSize:10,fontWeight:themeName===key?700:400,color:theme.txt,
                textShadow:key==="light"?"none":"none"}}>{theme.name}</span>
              {themeName===key&&<span style={{fontSize:8,color:theme.blue,fontWeight:700}}>✓ Aktiv</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom Theme Editor ──────────────────────────────────────── */}
      <CustomThemeEditor/>

      {/* ── Randlos-Modus ── */}
      <div style={{marginBottom:14}}>
        <div style={{color:T.lbl||T.txt2,fontSize:11,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
          {Li("square",13,T.blue)} Darstellung
        </div>
        <div onClick={()=>{const v=!noBorders;setNoBorders(v);kvStore.setItem("mbt_noborders",v?"1":"0");}}
          style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,
            cursor:"pointer",background:noBorders?`${T.blue}18`:"rgba(255,255,255,0.04)",
            border:`1px solid ${noBorders?T.blue:T.bd}`}}>
          <div style={{width:36,height:22,borderRadius:11,position:"relative",flexShrink:0,
            background:noBorders?T.blue:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
            <div style={{position:"absolute",top:3,left:noBorders?15:3,width:16,height:16,
              borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
          </div>
          <div>
            <div style={{color:T.txt,fontSize:12,fontWeight:600}}>Randlos</div>
            <div style={{color:T.txt2,fontSize:10}}>Alle Rahmenlinien ausblenden</div>
          </div>
        </div>
      </div>

      <Lbl>Eigene Bezeichnung der 3. Spalte (aktueller Ist-Stand)</Lbl>
      <input value={col3Name} onChange={e=>setCol3Name(e.target.value)} placeholder="z.B. aktuell, DKB, ING…" style={{...INP,marginBottom:8}}/>
      <div style={{color:T.txt2,fontSize:11,marginBottom:18}}>Erscheint als dritte Spaltenüberschrift (gold) im Jahres- und Monatsplan.</div>

      {/* Cloudflare Workers Sync */}
      <div style={{borderTop:`1px solid ${T.bd}`,marginTop:8,paddingTop:10,marginBottom:8}}>
        <div style={{color:T.lbl||T.txt2,fontSize:11,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
          {Li("cloud",13,T.cf)} Cloudflare Workers Sync
          <span style={{marginLeft:"auto",fontSize:10,
            color:cfStatus==="ok"?T.pos:cfStatus==="error"?T.neg:cfStatus==="saving"?T.gold:T.txt2,fontWeight:700}}>
            {cfStatus==="ok"?"● aktiv":cfStatus==="error"?"● Fehler":cfStatus==="saving"?"● speichert…":"● nicht verbunden"}
          </span>
        </div>
        <div style={{color:T.txt2,fontSize:10,marginBottom:8,lineHeight:1.5}}>
          <b style={{color:T.gold}}>Empfohlen</b> — kostenlos, kein Limit, kein CORS-Problem.
          Einrichtung: siehe Anleitung <b style={{color:T.txt}}>Cloudflare-Setup.md</b>.
        </div>
        <Lbl>Worker URL (https://mbt-sync.DEIN-NAME.workers.dev)</Lbl>
        <SupaField value={cfUrl} onChange={v=>{const u=v.trim();setCfUrl(u);kvStore.setItem("cf_url",u);}}
          placeholder="https://mbt-sync.xxx.workers.dev" locked={false} type="text"/>
        <Lbl>Secret (selbst gewähltes Passwort)</Lbl>
        <SupaField value={cfSecret} onChange={v=>{setCfSecret(v);kvStore.setItem("cf_secret",v);}}
          placeholder="MeinGeheimesPasswort123" locked={false} type="password"/>
        {cfActive&&(
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <button onClick={async()=>{
              try{
                setCfStatus("loading");
                const r=await fetch(cfUrl.replace(/\/$/,"")+"/ping",{headers:{"X-Secret":cfSecret}});
                if(!r.ok) throw new Error(`Status ${r.status}`);
                setCfStatus("ok"); alert("Cloudflare Verbindung OK!");
              }catch(e){setCfStatus("error");alert("Fehler: "+e.message);}
            }} style={{flex:1,padding:"8px",borderRadius:9,border:`1px solid ${T.cf}44`,
              background:`${T.cf}11`,color:T.cf,fontSize:12,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
              {Li("wifi",12,T.cf)} Verbindung testen
            </button>
          </div>
        )}
        {cfActive&&(
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            {(()=>{
              const {saveConfig}=useContext(AppCtx);
              return (
                <button onClick={()=>saveConfig?.()}
                  disabled={cfStatus==="saving"}
                  style={{flex:1,padding:"10px 8px",borderRadius:9,border:"none",
                    background:cfStatus==="saving"?T.gold:T.pos,
                    color:T.on_accent,fontSize:13,fontWeight:700,
                    cursor:cfStatus==="saving"?"wait":"pointer",
                    fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {cfStatus==="saving"
                    ?<>{Li("loader",14,T.on_accent)} Speichert…</>
                    :<>{Li("upload-cloud",14,T.on_accent)} ⬆ Lokal → Cloudflare speichern</>}
                </button>
              );
            })()}
          </div>
        )}
        {cfActive&&(
          <button onClick={async()=>{
            try{
              setCfStatus("loading");
              const data=await cfLoad();
              if(!data?.cats?.length){alert("Keine Daten gefunden.");setCfStatus("error");return;}
              if(window.confirm("Cloudflare → Lokal laden?\n\nAchtung: Lokale Änderungen werden überschrieben!")){
                applyData(data);setCfStatus("ok");alert("Daten erfolgreich geladen!");
              }else setCfStatus("ok");
            }catch(e){setCfStatus("error");alert("Fehler: "+e.message);}
          }} style={{width:"100%",padding:"10px 8px",borderRadius:9,marginBottom:6,
            border:`2px solid ${T.blue}`,background:`${T.blue}11`,color:T.blue,
            fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {Li("download-cloud",14,T.blue)} ⬇ Cloudflare → Lokal laden
          </button>
        )}
        {/* Sync-Status + Fehleranzeige */}
        {cfActive&&(
          <div style={{marginTop:4,padding:"8px 10px",borderRadius:8,
            border:`1px solid ${syncStatus==="error"?T.err:T.bd}`,
            background:syncStatus==="error"?"rgba(255,0,0,0.08)":"rgba(255,255,255,0.03)",
            display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
              background:syncStatus==="error"?T.err:syncStatus==="saving"?T.warn:syncStatus==="saved"?T.pos:cfStatus==="ok"?T.pos:"rgba(128,128,128,0.4)"}}/>
            <span style={{flex:1,color:T.txt2,fontSize:11}}>
              {syncStatus==="error"?"Sync-Fehler: "+syncError:
               syncStatus==="saving"?"Speichert…":
               syncStatus==="saved"?"Zuletzt gespeichert ✓":
               cfStatus==="ok"?"Verbunden — keine ungespeicherten Änderungen":
               "Nicht verbunden"}
            </span>
            {syncStatus==="error"&&(
              <button onClick={()=>setSyncStatus("idle")}
                style={{background:"none",border:"none",color:T.txt2,cursor:"pointer",padding:2}}>
                {Li("x",12,T.txt2)}
              </button>
            )}
          </div>
        )}
        {/* Beim Schließen automatisch hochladen — optional */}
        {(()=>{
          const onClose = false, setOnClose = ()=>{};
          return (
            <div onClick={()=>{
              const v=!onClose;
              setOnClose(v);
              kvStore.setItem("mbt_cf_save_on_close", v?"1":"0");
            }} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
              padding:"6px 2px",userSelect:"none",marginTop:6}}>
              <div style={{width:32,height:18,borderRadius:9,position:"relative",flexShrink:0,
                background:onClose?T.pos:"rgba(255,255,255,0.15)",transition:"background 0.2s"}}>
                <div style={{position:"absolute",top:2,left:onClose?14:2,width:14,height:14,
                  borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
              </div>
              <span style={{fontSize:11,color:T.txt2}}>
                Beim Schließen automatisch zu Cloudflare hochladen
              </span>
            </div>
          );
        })()}
      </div>

      {/* Budget-Wartung */}
      {(()=>{
        const allBudgetTxs = txs.filter(t=>t._budgetSubId && t.pending);
        if(allBudgetTxs.length === 0) return null;
        // Gruppieren nach _budgetSubId
        const bySubId = {};
        allBudgetTxs.forEach(t=>{
          if(!bySubId[t._budgetSubId]) bySubId[t._budgetSubId] = [];
          bySubId[t._budgetSubId].push(t);
        });
        return (
          <div style={{borderTop:`1px solid ${T.bd}`,marginTop:8,paddingTop:10,marginBottom:8}}>
            <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
              {Li("target",12,T.gold)} Budget-Platzhalter Wartung
            </div>
            <div style={{color:T.txt2,fontSize:10,marginBottom:10,lineHeight:1.5}}>
              Alle Budget-Platzhalter nach Unterkategorie. Löschen macht Platz für einen sauberen Neustart — Budget-Einstellungen bleiben erhalten, neue Platzhalter werden beim nächsten Speichern automatisch erzeugt.
            </div>
            {Object.entries(bySubId).map(([subId, entries])=>{
              const firstTx = entries[0];
              // Beschreibung aus erstem Eintrag (z.B. "Einkommen / Gehalt")
              const label = firstTx.desc || subId;
              const minDate = entries.map(t=>t.date).sort()[0];
              const maxDate = entries.map(t=>t.date).sort().reverse()[0];
              const hasOldSeries = entries.some(t=>t._seriesId);
              return (
                <div key={subId} style={{display:"flex",alignItems:"center",gap:8,
                  background:"rgba(255,255,255,0.04)",borderRadius:9,padding:"7px 10px",
                  marginBottom:4,border:`1px solid ${hasOldSeries?T.gold+"55":T.bd}`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:T.txt,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {label}
                    </div>
                    <div style={{color:T.txt2,fontSize:10,marginTop:1}}>
                      {entries.length} Einträge · {minDate} – {maxDate}
                      {hasOldSeries&&<span style={{color:T.gold,marginLeft:6,fontWeight:700}}>⚠ alt</span>}
                    </div>
                  </div>
                  <button onClick={()=>{
                    if(!window.confirm(`Alle ${entries.length} Budget-Platzhalter für „${label}" löschen?`)) return;
                    setTxs(p=>p.filter(t=>!(t._budgetSubId===subId && t.pending)));
                  }} style={{flexShrink:0,padding:"5px 10px",borderRadius:7,
                    border:`1px solid ${T.neg}44`,background:`${T.neg}08`,
                    color:T.neg,fontSize:11,fontWeight:700,cursor:"pointer",
                    fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                    {Li("trash-2",11,T.neg)} Löschen
                  </button>
                </div>
              );
            })}
            <button onClick={()=>{
              if(!window.confirm(`Wirklich ALLE ${allBudgetTxs.length} Budget-Platzhalter löschen (alle Kategorien)?`)) return;
              setTxs(p=>p.filter(t=>!(t._budgetSubId && t.pending)));
            }} style={{width:"100%",padding:"7px",borderRadius:9,marginTop:6,
              border:`1px solid ${T.neg}33`,background:`${T.neg}06`,
              color:T.neg,fontSize:11,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              {Li("trash-2",11,T.neg)} Alle {allBudgetTxs.length} Budget-Platzhalter löschen
            </button>
          </div>
        );
      })()}

      {/* Gefahrenzone */}
      <div style={{borderTop:`1px solid ${T.bd}`,marginTop:8,paddingTop:10}}>
        <div style={{color:T.txt2,fontSize:11,fontWeight:600,marginBottom:6}}>Gefahrenzone</div>
        {!confirmReset
          ? <button onClick={()=>setConfirmReset(true)}
              style={{width:"100%",padding:"11px",borderRadius:11,border:`1px solid rgba(224,80,96,0.4)`,
                background:"rgba(224,80,96,0.08)",color:T.neg,fontSize:13,fontWeight:600,
                cursor:"pointer",marginBottom:12,textAlign:"left"}}>
              {Li("trash-2",14)} alle Daten zurücksetzen
            </button>
          : <div style={{background:"rgba(224,80,96,0.12)",border:`1px solid ${T.neg}`,borderRadius:11,padding:14,marginBottom:12}}>
              <div style={{color:T.neg,fontSize:13,fontWeight:700,marginBottom:6}}>{Li("alert-circle",14,T.neg)} Wirklich alles löschen?</div>
              <div style={{color:T.txt2,fontSize:11,marginBottom:12,lineHeight:1.5}}>
                Kategorien, Gruppen, Buchungen, Jahresplan und Zahlungsarten werden unwiderruflich entfernt.
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setConfirmReset(false)}
                  style={{flex:1,padding:"9px",borderRadius:9,border:`1px solid ${T.bds}`,
                    background:"transparent",color:T.txt2,fontSize:13,cursor:"pointer",fontWeight:600}}>
                  Abbrechen
                </button>
                <button onClick={()=>{
                  setCats([]); setGroups([]); setTxs([]); setAccounts([]);
                  setYearData(makeYearData()); setCol3Name("aktuell");
                  setConfirmReset(false);
                }}
                  style={{flex:1,padding:"9px",borderRadius:9,border:"none",
                    background:T.neg,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  Ja, alles löschen
                </button>
              </div>
            </div>
        }
      </div>
    </div>
  );
}

export { SettingsInline };
