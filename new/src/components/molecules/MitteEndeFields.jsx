// Auto-generated module (siehe app-src.jsx)

import React, { useContext, useState } from "react";
import { AppCtx } from "../../state/AppContext.js";
import { theme as T } from "../../theme/activeTheme.js";
import { fmt, pn } from "../../utils/format.js";
import { Li } from "../../utils/icons.jsx";

function MitteEndeFields({tx, pal, fulfilled, needsHatch, effE=""}) {
  const { cats,setCats,groups,setGroups,txs,setTxs,accounts,setAccounts,
    yearData,setYearData,year,setYear,month,setMonth,isLand,
    col3Name,setCol3Name,modal,setModal,mgmtCat,setMgmtCat,
    editTx,setEditTx,newTx,setNewTx,newCat,setNewCat,
    newSubName,setNewSubName,exportModal,setExportModal,
    getCat,getSub,txType,getActualSum,getTotalIncome,getTotalExpense,getPendingSum,pendingItemsFor,
    getJV,setJV,getMV,setMV,getAcc,openEdit,saveEdit,deleteFromEdit,
    updEditSplit,moveCat,moveSub,updateSub,updateCat,
    renameCat,renameSub,deleteCat,deleteSub,saveNewCat,saveNewSub,
    moveAcc,
    addSplit,removeSplit,updSplit,splitTotal,splitDiff,txValid,saveTx,
    onTS,onTE,
    setShowVormHub, setEditVormTx,
  } = useContext(AppCtx);

    const [openCol, setOpenCol] = useState(null); // "M"|"E"|null

    // For each col: compute sum from pending items (individual amounts, editable via txs state)
    const colItems = (col) => {
      // Collect all subIds from this tx's splits
      const subIds = (tx.splits||[]).map(sp=>sp.subId).filter(Boolean);
      const items = [];
      subIds.forEach(subId => {
        pendingItemsFor(year, month, subId, col).forEach(item => {
          if (!items.find(i=>i.txId===item.txId)) items.push(item);
        });
      });
      return items;
    };

    const sumOf = (col) => colItems(col).reduce((s,i)=>s+pn(i.amount),0);

    // Update a single pending tx's split amount (for a given subId)
    const updatePendingAmount = (txId, newAmt) => {
      setTxs(p => p.map(t => {
        if (t.id !== txId) return t;
        const newTotal = pn(newAmt); // for single-split pending, totalAmount = that split
        return {
          ...t,
          totalAmount: newTotal,
          splits: (t.splits||[]).map(sp => ({...sp, amount: newTotal})),
        };
      }));
    };

    return (
      <div style={{borderTop:`1px solid ${pal.bd}`}}>
        {/* Row: Mitte | Ende | aktuell */}
        <div style={{display:"flex"}}>
          {[["M","Mitte",false],["E","Ende",false],["D",col3Name,true]].map(([col,lbl,isGold])=>{
            const isExpanded = openCol===col;
            const items = col!=="D" ? colItems(col) : [];
            const autoSum = col!=="D" ? sumOf(col) : 0;
            const stored = getMV(year,month,tx.id,col);
            // Display: if col has pending items, show their sum; else show stored manual value
            const displayVal = col!=="D" && items.length>0 ? autoSum : pn(stored||0);
            const hasItems = items.length>0;
            const bg = col==="D"&&fulfilled?"rgba(200,212,0,0.15)":col==="D"&&needsHatch?"rgba(224,80,96,0.12)":"rgba(0,0,0,0.25)";

            return (
              <div key={col} style={{flex:1,borderRight:col!=="D"?`1px solid ${pal.bd}`:"none"}}>
                {/* Label row */}
                <div style={{padding:"5px 5px 2px",display:"flex",justifyContent:"space-between",alignItems:"center",
                  cursor:col!=="D"&&hasItems?"pointer":"default"}}
                  onClick={()=>col!=="D"&&hasItems&&setOpenCol(isExpanded?null:col)}>
                  <span style={{color:isGold?T.gold:"rgba(200,210,230,0.4)",fontSize:8,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase"}}>{lbl}</span>
                  {hasItems&&col!=="D"&&<span style={{color:pal.hdr,fontSize:8,display:"inline-block",transform:isExpanded?"rotate(90deg)":"none",transition:"transform 0.15s"}}>{Li("chevron-right",14)}</span>}
                </div>
                {/* Value: sum-display for M/E with items, editable input for D and empty M/E */}
                <div style={{padding:"0 5px 5px"}}>
                  {col!=="D"&&hasItems
                    ? <div onClick={()=>setOpenCol(isExpanded?null:col)}
                        style={{textAlign:"right",color:pal.val,fontSize:12,fontWeight:700,fontFamily:"monospace",
                          padding:"4px 5px",borderRadius:7,background:bg,minHeight:24,
                          display:"flex",alignItems:"center",justifyContent:"flex-end",cursor:"pointer"}}>
                        {fmt(autoSum)}
                        <span style={{color:pal.hdr,fontSize:9,marginLeft:4}}>{items.length}×</span>
                      </div>
                    : <input
                        value={stored}
                        onChange={e=>setMV(year,month,tx.id,col,e.target.value)}
                        onClick={e=>e.stopPropagation()}
                        placeholder="–"
                        inputMode="decimal"
                        style={{background:bg,border:`1px solid ${isGold&&stored?T.gold+"55":stored?pal.bd:"transparent"}`,
                          outline:"none",color:stored?pal.val:"rgba(150,160,175,0.35)",
                          fontSize:12,fontFamily:"monospace",fontWeight:600,textAlign:"right",width:"100%",
                          padding:"4px 5px",borderRadius:7,boxSizing:"border-box",minHeight:24}}
                      />
                  }
                </div>

                {/* Expanded individual items */}
                {isExpanded&&hasItems&&(
                  <div style={{borderTop:`1px solid ${pal.bd}`,background:"rgba(0,0,0,0.2)",padding:"6px 5px 5px"}}>
                    <div style={{color:"rgba(200,210,230,0.4)",fontSize:8,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",marginBottom:2,paddingLeft:2}}>
                      Einzelbeträge
                    </div>
                    {items.map((item, ii) => (
                      <div key={item.txId} style={{marginBottom:2}}>
                        <div style={{color:pal.hdr,fontSize:9,marginBottom:1,paddingLeft:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {item.desc||"Vormerkung"}
                        </div>
                        <input
                          value={item.amount}
                          onChange={e => updatePendingAmount(item.txId, e.target.value)}
                          inputMode="decimal"
                          style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${pal.bd}`,outline:"none",
                            color:pal.val,fontSize:12,fontFamily:"monospace",fontWeight:700,textAlign:"right",
                            width:"100%",padding:"4px 6px",borderRadius:7,boxSizing:"border-box"}}
                        />
                      </div>
                    ))}
                    <div style={{borderTop:`1px solid ${pal.bd}`,marginTop:4,paddingTop:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{color:"rgba(200,210,230,0.4)",fontSize:9}}>Summe</span>
                      <span style={{color:pal.val,fontSize:12,fontWeight:800,fontFamily:"monospace"}}>{fmt(sumOf(col))}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

}

// ══════════════════════════════════════════════════════════════════════

export { MitteEndeFields };
