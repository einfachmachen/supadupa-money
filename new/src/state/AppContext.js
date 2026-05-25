// App-Context: Default-Werte und Context-Objekt
import { createContext } from "react";

const _ctxDefault = {
  cats:[], groups:[], txs:[], accounts:[], quickBtns:[], quickColors:[],
  year:2026, month:new Date().getMonth(), isLand:false,
  yearData:{}, col3Name:"aktuell",
  modal:null, mgmtCat:null, editTx:null, exportModal:null,
  newTx:{splits:[]}, newCat:{name:"",icon:"",type:"expense",color:"#FFA07A"},
  newSubName:"",
  setCats:()=>{}, setGroups:()=>{}, setTxs:()=>{}, setAccounts:()=>{},
  setYear:()=>{}, setMonth:()=>{}, setCol3Name:()=>{},
  setModal:()=>{}, setMgmtCat:()=>{}, setEditTx:()=>{}, setExportModal:()=>{},
  setNewTx:()=>{}, setNewCat:()=>{}, setNewSubName:()=>{}, setQuickBtns:()=>{}, setQuickColors:()=>{},
  setYearData:()=>{}, showQuickPicker:false, setShowQuickPicker:()=>{},
  supaUrl:"", setSupaUrl:()=>{}, supaKey:"", setSupaKey:()=>{},
  jsonbinActive:false, jsonbinSave:async()=>{}, jsonbinLoad:async()=>({}), jsonbinStatus:"idle", setJsonbinStatus:()=>{}, jsonbinKey:"", jsonbinId:"", setJsonbinKey:()=>{}, setJsonbinId:()=>{},
  gistActive:false, gistSave:async()=>{}, gistLoad:async()=>({}), gistStatus:"idle", setGistStatus:()=>{}, gistToken:"", gistId:"", setGistToken:()=>{}, setGistId:()=>{}, applyData:()=>{},
  cfActive:false, cfSave:async()=>{}, cfLoad:async()=>({}), cfStatus:"idle", setCfStatus:()=>{}, cfUrl:"", cfSecret:"", setCfUrl:()=>{}, setCfSecret:()=>{}, cfSaveOnClose:false, setCfSaveOnClose:()=>{},
  themeName:"dark", setThemeName:()=>{}, hideEmptyRows:true, setHideEmptyRows:()=>{}, handedness:"right", setHandedness:()=>{},
  supaStatus:"idle", supaError:"", testSupaConnection:()=>{}, saveSupaSettings:()=>{},
  getCat:()=>null, getSub:()=>null, txType:()=>"expense",
  getActualSum:()=>0, getPendingSum:()=>0, pendingItemsFor:()=>[],
  
  getJV:()=>"", setJV:()=>{}, getMV:()=>"", setMV:()=>{}, getAcc:()=>null,
  openEdit:()=>{}, saveEdit:()=>{}, deleteFromEdit:()=>{}, updEditSplit:()=>{},
  moveCat:()=>{}, moveSub:()=>{}, updateSub:()=>{}, updateCat:()=>{},
  renameCat:()=>{}, renameSub:()=>{}, deleteCat:()=>{}, deleteSub:()=>{},
  saveNewCat:()=>{}, saveNewSub:()=>{}, moveAcc:()=>{},
  addSplit:()=>{}, removeSplit:()=>{}, updSplit:()=>{},
  splitTotal:0, splitDiff:0, txValid:false, saveTx:()=>{},
  onTS:()=>{}, onTE:()=>{}, csvRules:{}, setCsvRules:()=>{}, budgets:{}, setBudgets:()=>{},
  globalDrag: {current: null}, // {icon, color} während Drag aktiv
};
const AppCtx = createContext(_ctxDefault);

export { AppCtx, _ctxDefault };
