// Auto-generated module (siehe app-src.jsx)

const groupBudgetPairs = (txList) => {
  const result = [];
  const usedIds = new Set();
  txList.forEach(tx=>{
    if(usedIds.has(tx.id)) return;
    if(tx._budgetSubId && tx._budgetSubId.endsWith("_mitte")) {
      const endSubId = tx._budgetSubId.slice(0,-6);
      const [y,m] = tx.date.split("-");
      const partner = txList.find(t=>!usedIds.has(t.id)&&t.id!==tx.id&&
        t._budgetSubId===endSubId&&t.date.startsWith(`${y}-${m}`));
      if(partner) {
        usedIds.add(tx.id); usedIds.add(partner.id);
        result.push({...tx,_mitteAmt:tx.totalAmount,_endeAmt:partner.totalAmount,
          _partnerId:partner.id,_isBudgetPair:true});
        return;
      }
    }
    if(tx._budgetSubId && !tx._budgetSubId.endsWith("_mitte")) {
      const mitteSubId = tx._budgetSubId+"_mitte";
      const [y,m] = tx.date.split("-");
      const partner = txList.find(t=>!usedIds.has(t.id)&&t.id!==tx.id&&
        t._budgetSubId===mitteSubId&&t.date.startsWith(`${y}-${m}`));
      if(partner) {
        usedIds.add(tx.id); usedIds.add(partner.id);
        result.push({...tx,_mitteAmt:partner.totalAmount,_endeAmt:tx.totalAmount,
          _partnerId:partner.id,_isBudgetPair:true});
        return;
      }
    }
    usedIds.add(tx.id);
    result.push(tx);
  });
  return result;
};

// Day of month from ISO date string

export { groupBudgetPairs };
