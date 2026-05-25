// Auto-generated module (siehe app-src.jsx)

import { BASE_ROWS, CUR_YEAR } from "./constants.js";

function makeYearData() {
  const d={};
  for(let y=CUR_YEAR-2;y<=CUR_YEAR+3;y++){
    d[y]={};
    for(let m=0;m<12;m++){
      const o={};
      BASE_ROWS.forEach(r=>{ if(r.cols){o[r.id+"_M"]="";o[r.id+"_E"]="";o[r.id+"_D"]="";}else o[r.id]=""; });
      d[y][m]=o;
    }
  }
  return d;
}

export { makeYearData };
