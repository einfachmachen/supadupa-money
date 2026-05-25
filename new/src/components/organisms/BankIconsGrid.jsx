// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useRef } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { Li } from "../../utils/icons.jsx";
import { kvStore } from "../../utils/kvStore.js";

function BankIconsGrid({selectedIcon, selectedColor, onSelect}) {
  const col = selectedColor || T.blue;
  const { customIcons, setCustomIcons } = useContext(AppCtx);
  const fileRef = React.useRef();

  const handleUpload = (e) => {
    const files = Array.from(e.target.files||[]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target.result;
        const name = file.name.replace(/\.[^.]+$/,"");
        const slug = "up:" + Date.now() + "_" + name.replace(/[^a-z0-9]/gi,"_");
        setCustomIcons(p => {
          const newIcons = [...(p||[]), {slug, label:name, data:b64}];
          kvStore.setItem("mbt_custom_icons", JSON.stringify(newIcons));
          return newIcons;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value="";
  };

  const deleteIcon = (slug, e) => {
    e.stopPropagation();
    setCustomIcons(p => {
      const newIcons = (p||[]).filter(ic=>ic.slug!==slug);
      kvStore.setItem("mbt_custom_icons", JSON.stringify(newIcons));
      return newIcons;
    });
  };

  return (
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,padding:4}}>
      {/* Upload Button */}
      <div onClick={()=>fileRef.current?.click()}
        style={{borderRadius:12,border:`2px dashed ${T.blue}66`,background:"rgba(74,159,212,0.05)",
          padding:"14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,flexShrink:0}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(74,159,212,0.1)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(74,159,212,0.05)"}>
        <input ref={fileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp"
          multiple onChange={handleUpload} style={{display:"none"}}/>
        {Li("upload",20,T.blue)}
        <div>
          <div style={{color:T.blue,fontSize:12,fontWeight:700}}>SVG oder PNG hochladen</div>
          <div style={{color:T.txt2,fontSize:10,marginTop:2}}>Banklogos, eigene Icons — nur lokal gespeichert</div>
        </div>
      </div>
      {/* Uploaded Icons Grid */}
      {customIcons.length===0 ? (
        <div style={{color:T.txt2,fontSize:11,textAlign:"center",padding:"20px 0",opacity:0.6}}>
          Noch keine eigenen Icons hochgeladen
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
          {customIcons.map(({slug,label,data})=>(
            <button key={slug} onClick={()=>onSelect(slug)}
              style={{borderRadius:10,border:selectedIcon===slug?`2px solid ${col}`:`1px solid rgba(255,255,255,0.1)`,
                background:selectedIcon===slug?col+"22":T.surf,
                cursor:"pointer",padding:"6px 4px",display:"flex",flexDirection:"column",
                alignItems:"center",gap:3,position:"relative"}}>
              <img src={data} style={{width:36,height:24,objectFit:"contain",opacity:0.9}}/>
              <span style={{fontSize:8,color:T.txt2,textAlign:"center",overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%",padding:"0 2px"}}>{label}</span>
              <span onClick={e=>deleteIcon(slug,e)}
                style={{position:"absolute",top:2,right:2,color:T.neg,opacity:0.5,fontSize:10,
                  lineHeight:1,cursor:"pointer",padding:2}}
                onMouseEnter={e=>e.currentTarget.style.opacity=1}
                onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { BankIconsGrid };
