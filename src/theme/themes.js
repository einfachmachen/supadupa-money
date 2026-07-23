// Theme-Definitionen
const THEMES = {
  dark: {
    bg:"#2C3035", surf:"#363B42", surf2:"#3D4349",
    bd:"rgba(200,210,220,0.15)", bds:"rgba(200,210,220,0.28)",
    txt:"#F0F2F4", txt2:"rgba(200,210,220,0.60)",
    blue:"#AACC00", pos:"#AACC00", neg:"#FF4D06", gold:"#F5A623",
    lbl:"rgba(200,210,220,0.45)",  // Sekundärtext auf Hintergrund (bg)
    vorm_bg:"#5A3A00", vorm_bd:"rgba(255,200,0,0.8)",  // Offene Vormerkungen Bar
    cf:"#F6821F",      // Cloudflare-Akzent
    mid:"#67E8F9",     // "Mitte"-Label Farbe
    on_accent:"#1A1E00", disabled:"#2a2a2a",
    warn:"#F59E0B", override:"#B45309",
    cell_inc:"#9CB336", cell_inc_bg:"#0F1A00", cell_inc_bd:"#4A6600", cell_exp:"#FFE580", over:"#FF7EB6",
    tab_exp:"#6B1A10", tab_inc:"#2A4A00", tab_pend:"#5A3A00",
    surf3:"#2A2E35", err:"#FF4444",
    // PAL: Buchungs-Panel-Farben
    pal_inc_bg:"#161900", pal_inc_bd:"#3A4800", pal_inc_hdr:"#C8D400", pal_inc_fld:"#1A1E00", pal_inc_val:"#D4E040",
    pal_exp_bg:"#1F0608", pal_exp_bd:"#5C1018", pal_exp_fld:"#240408",
    pal_tg_bg:"#071820",  pal_tg_bd:"#1A3A48",  pal_tg_hdr:"#4A9FC0",  pal_tg_fld:"#091E2A",  pal_tg_val:"#80C8E0",
    hero_bg:"linear-gradient(135deg,#1A1D22,#252B34)", logo_c1:"#6B9900", logo_c2:"#AACC00", err_bg:"#7A1020",
    cond_neg:"#FF4D06", cond_warn:"#E67E22", cond_gold:"#F1C40F", cond_pos:"#2ECC71",
    name:"Dark (Dove Sport)",
  },
  light: {
    bg:"#F2F4EF",    // Helles Grau-Grün
    surf:"#FFFFFF",  // Weiß
    surf2:"#EAEDE6", // Leicht getönt
    bd:"rgba(60,80,40,0.15)", bds:"rgba(60,80,40,0.28)",
    txt:"#1E2418",   // Fast Schwarz
    txt2:"rgba(60,80,40,0.55)",
    blue:"#6B9900",  // Dunkleres Limegreen (leserlich auf hell)
    pos:"#6B9900",   // Einnahmen
    neg:"#C0311A",   // Etwas gedämpftes Rot
    gold:"#C07800",  // Dunkleres Amber
    lbl:"rgba(60,80,40,0.42)",     // Sekundärtext auf Hintergrund (bg)
    vorm_bg:"#FFF3CC", vorm_bd:"rgba(180,130,0,0.6)",  // Offene Vormerkungen Bar
    cf:"#D4601A",      // Cloudflare-Akzent (dunkler für hell)
    mid:"#2A90B8",     // "Mitte"-Label Farbe (dunkler für hell)
    on_accent:"#FFFFFF", disabled:"#C0C8B0",
    warn:"#B45309", override:"#8B4A00",
    cell_inc:"#3A6600", cell_inc_bg:"#EDF5D0", cell_inc_bd:"#9CC050",
    tab_exp:"#FEE8E4", tab_inc:"#E8F5D0", tab_pend:"#FFF3CC",
    surf3:"#E8EDE4", err:"#C0271A",
    // PAL: Buchungs-Panel-Farben (hell)
    pal_inc_bg:"#F5FAE8", pal_inc_bd:"#C8DC80", pal_inc_hdr:"#6B9900", pal_inc_fld:"#EEF6D8", pal_inc_val:"#4A7000",
    pal_exp_bg:"#FEF2F0", pal_exp_bd:"#F0B0A8", pal_exp_fld:"#FDE8E4",
    pal_tg_bg:"#EFF7FC",  pal_tg_bd:"#A8D0E8",  pal_tg_hdr:"#4A9FC0",  pal_tg_fld:"#E4F2F8",  pal_tg_val:"#2A7A9C",
    hero_bg:"linear-gradient(135deg,#7AAD00,#9CC800)", logo_c1:"#6B9900", logo_c2:"#AACC00", err_bg:"#7A0010",
    cond_neg:"#C0392B", cond_warn:"#E67E22", cond_gold:"#D4A017", cond_pos:"#1A8A4A",
    name:"Light (Dove Sport Hell)",
  },
  // ── Amazon Fire TV (1st Gen) ────────────────────────────────────────────
  firetv: {
    bg:"#161616", surf:"#232323", surf2:"#2C2C2C",
    bd:"rgba(255,165,0,0.18)", bds:"rgba(255,165,0,0.35)",
    txt:"#F0F0F0", txt2:"rgba(220,200,160,0.55)",
    blue:"#FF9900", pos:"#67C15E", neg:"#FF4D06", gold:"#FF9900",
    lbl:"rgba(220,200,160,0.45)",
    vorm_bg:"#2A1A00", vorm_bd:"rgba(255,153,0,0.7)",
    cf:"#FF9900", mid:"#67C15E",
    on_accent:"#111111", disabled:"#333333",
    warn:"#FF9900", override:"#CC7700",
    cell_inc:"#509749", cell_inc_bg:"#0D1F0C", cell_inc_bd:"#2A5A28", cell_exp:"#FFE580", over:"#FF7EB6",
    tab_exp:"#2A1010", tab_inc:"#0D1F0C", tab_pend:"#2A1A00",
    surf3:"#1C1C1C", err:"#E05252",
    pal_inc_bg:"#0D1F0C", pal_inc_bd:"#2A5A28", pal_inc_hdr:"#67C15E", pal_inc_fld:"#142014", pal_inc_val:"#8AE080",
    pal_exp_bg:"#1F0A0A", pal_exp_bd:"#5A2020", pal_exp_fld:"#280F0F",
    pal_tg_bg:"#1A1400", pal_tg_bd:"#4A3800", pal_tg_hdr:"#FF9900", pal_tg_fld:"#221A00", pal_tg_val:"#FFBB44",
    hero_bg:"linear-gradient(135deg,#1C1C1C,#2C2C2C)",  logo_c1:"#FF9900", logo_c2:"#FFBB44", err_bg:"#5A1010",
    cond_neg:"#FF4D06", cond_warn:"#FF9900", cond_gold:"#FFD700", cond_pos:"#67C15E",
    name:"Amazon Fire TV",
  },
  // ── Xbox Series S/X ──────────────────────────────────────────────────────
  xbox: {
    bg:"#0A0A0A", surf:"#141414", surf2:"#1E1E1E",
    bd:"rgba(16,124,16,0.25)", bds:"rgba(16,124,16,0.50)",
    txt:"#FFFFFF", txt2:"rgba(180,220,180,0.55)",
    blue:"#107C10", pos:"#5EC95E", neg:"#FF4D06", gold:"#FFB900",
    lbl:"rgba(180,220,180,0.45)",
    vorm_bg:"#0A1A0A", vorm_bd:"rgba(16,124,16,0.75)",
    cf:"#107C10", mid:"#5EC95E",
    on_accent:"#FFFFFF", disabled:"#2A2A2A",
    warn:"#FFB900", override:"#CC8800",
    cell_inc:"#499D49", cell_inc_bg:"#061406", cell_inc_bd:"#1A4A1A", cell_exp:"#FFE580", over:"#FF7EB6",
    tab_exp:"#1A0808", tab_inc:"#061406", tab_pend:"#1A1400",
    surf3:"#121212", err:"#D04040",
    pal_inc_bg:"#061406", pal_inc_bd:"#1A4A1A", pal_inc_hdr:"#5EC95E", pal_inc_fld:"#0A1E0A", pal_inc_val:"#80E080",
    pal_exp_bg:"#1A0606", pal_exp_bd:"#4A1414", pal_exp_fld:"#220A0A",
    pal_tg_bg:"#0A1000", pal_tg_bd:"#203A10", pal_tg_hdr:"#107C10", pal_tg_fld:"#0E1A08", pal_tg_val:"#40A040",
    hero_bg:"linear-gradient(135deg,#0A0A0A,#141414)",   logo_c1:"#107C10", logo_c2:"#5EC95E", err_bg:"#4A0808",
    cond_neg:"#FF4D06", cond_warn:"#FFB900", cond_gold:"#FFD700", cond_pos:"#5EC95E",
    name:"Xbox Series",
  },
  // ── PlayStation 5 ────────────────────────────────────────────────────────
  ps5: {
    bg:"#050914", surf:"#0D1526", surf2:"#152038",
    bd:"rgba(0,160,214,0.20)", bds:"rgba(0,160,214,0.40)",
    txt:"#E8F0FF", txt2:"rgba(160,190,230,0.55)",
    blue:"#00A0D6", pos:"#00CC88", neg:"#FF4D06", gold:"#F0C040",
    lbl:"rgba(160,190,230,0.45)",
    vorm_bg:"#0A0818", vorm_bd:"rgba(0,160,214,0.65)",
    cf:"#00A0D6", mid:"#00CC88",
    on_accent:"#FFFFFF", disabled:"#1A2A3A",
    warn:"#F0C040", override:"#C09030",
    cell_inc:"#009F6A", cell_inc_bg:"#00180E", cell_inc_bd:"#005A38", cell_exp:"#FFE580", over:"#FF7EB6",
    tab_exp:"#1A0818", tab_inc:"#00180E", tab_pend:"#180A00",
    surf3:"#0A1020", err:"#E84060",
    pal_inc_bg:"#00180E", pal_inc_bd:"#005A38", pal_inc_hdr:"#00CC88", pal_inc_fld:"#002010", pal_inc_val:"#40E8A8",
    pal_exp_bg:"#180610", pal_exp_bd:"#501828", pal_exp_fld:"#200816",
    pal_tg_bg:"#04091A", pal_tg_bd:"#082040", pal_tg_hdr:"#00A0D6", pal_tg_fld:"#071230", pal_tg_val:"#40C8F0",
    hero_bg:"linear-gradient(135deg,#050914,#0D1526)",   logo_c1:"#00A0D6", logo_c2:"#00CC88", err_bg:"#4A0818",
    cond_neg:"#FF4D06", cond_warn:"#F0C040", cond_gold:"#FFD700", cond_pos:"#00CC88",
    name:"PlayStation 5",
  },
  // ── Disney+ ──────────────────────────────────────────────────────────────
  disneyplus: {
    bg:"#040B1C", surf:"#0B1A38", surf2:"#122248",
    bd:"rgba(20,100,214,0.25)", bds:"rgba(20,100,214,0.48)",
    txt:"#F0F4FF", txt2:"rgba(160,185,230,0.55)",
    blue:"#1464D6", pos:"#1AC8A0", neg:"#FF4D06", gold:"#F5C518",
    lbl:"rgba(160,185,230,0.45)",
    vorm_bg:"#08102A", vorm_bd:"rgba(245,197,24,0.65)",
    cf:"#1464D6", mid:"#1AC8A0",
    on_accent:"#FFFFFF", disabled:"#1A2840",
    warn:"#F5C518", override:"#C89C14",
    cell_inc:"#149C7D", cell_inc_bg:"#001A14", cell_inc_bd:"#006050", cell_exp:"#FFE580", over:"#FF7EB6",
    tab_exp:"#1A0810", tab_inc:"#001A14", tab_pend:"#1A1000",
    surf3:"#081428", err:"#E83050",
    pal_inc_bg:"#001A14", pal_inc_bd:"#006050", pal_inc_hdr:"#1AC8A0", pal_inc_fld:"#002018", pal_inc_val:"#50E8C0",
    pal_exp_bg:"#180610", pal_exp_bd:"#501828", pal_exp_fld:"#200816",
    pal_tg_bg:"#030A1A", pal_tg_bd:"#0A1C48", pal_tg_hdr:"#1464D6", pal_tg_fld:"#081030", pal_tg_val:"#4890F0",
    hero_bg:"linear-gradient(135deg,#040B1C,#0B1A38)",   logo_c1:"#1464D6", logo_c2:"#1AC8A0", err_bg:"#4A0810",
    cond_neg:"#FF4D06", cond_warn:"#F5C518", cond_gold:"#FFD700", cond_pos:"#1AC8A0",
    name:"Disney+",
  },
  // ── Netflix ──────────────────────────────────────────────────────────────
  netflix: {
    bg:"#141414", surf:"#1F1F1F", surf2:"#2A2A2A",
    bd:"rgba(229,9,20,0.20)", bds:"rgba(229,9,20,0.40)",
    txt:"#FFFFFF", txt2:"rgba(200,200,200,0.55)",
    blue:"#E50914", pos:"#46D369", neg:"#FF4D06", gold:"#F5A623",
    lbl:"rgba(200,200,200,0.45)",
    vorm_bg:"#2A0808", vorm_bd:"rgba(229,9,20,0.70)",
    cf:"#E50914", mid:"#46D369",
    on_accent:"#FFFFFF", disabled:"#333333",
    warn:"#F5A623", override:"#CC7700",
    cell_inc:"#37A552", cell_inc_bg:"#091A0E", cell_inc_bd:"#1A5A28", cell_exp:"#FFE580", over:"#FF7EB6",
    tab_exp:"#2A0808", tab_inc:"#091A0E", tab_pend:"#1A1200",
    surf3:"#1A1A1A", err:"#E50914",
    pal_inc_bg:"#091A0E", pal_inc_bd:"#1A5A28", pal_inc_hdr:"#46D369", pal_inc_fld:"#0E2016", pal_inc_val:"#70E890",
    pal_exp_bg:"#1F0606", pal_exp_bd:"#601010", pal_exp_fld:"#280A0A",
    pal_tg_bg:"#141414", pal_tg_bd:"#3A1010", pal_tg_hdr:"#E50914", pal_tg_fld:"#1A0A0A", pal_tg_val:"#FF4444",
    hero_bg:"linear-gradient(135deg,#141414,#1F1F1F)",   logo_c1:"#E50914", logo_c2:"#FF4444", err_bg:"#5A0808",
    cond_neg:"#FF4D06", cond_warn:"#F5A623", cond_gold:"#FFD700", cond_pos:"#46D369",
    name:"Netflix",
  },
  // ── MagentaTV ────────────────────────────────────────────────────────────
  magenta: {
    bg:"#1A0018", surf:"#280028", surf2:"#340038",
    bd:"rgba(226,0,116,0.22)", bds:"rgba(226,0,116,0.44)",
    txt:"#FFE8F8", txt2:"rgba(255,180,240,0.55)",
    blue:"#E20074", pos:"#60D080", neg:"#FF4D06", gold:"#FFB800",
    lbl:"rgba(255,180,240,0.45)",
    vorm_bg:"#200018", vorm_bd:"rgba(226,0,116,0.70)",
    cf:"#E20074", mid:"#60D080",
    on_accent:"#FFFFFF", disabled:"#3A003A",
    warn:"#FFB800", override:"#CC8C00",
    cell_inc:"#4BA264", cell_inc_bg:"#081A10", cell_inc_bd:"#205A30", cell_exp:"#FFE580", over:"#FF7EB6",
    tab_exp:"#200010", tab_inc:"#081A10", tab_pend:"#180C00",
    surf3:"#1E0020", err:"#FF4060",
    pal_inc_bg:"#081A10", pal_inc_bd:"#205A30", pal_inc_hdr:"#60D080", pal_inc_fld:"#0E2018", pal_inc_val:"#88E8A0",
    pal_exp_bg:"#1E0810", pal_exp_bd:"#601028", pal_exp_fld:"#280A14",
    pal_tg_bg:"#140010", pal_tg_bd:"#400040", pal_tg_hdr:"#E20074", pal_tg_fld:"#1C0018", pal_tg_val:"#FF60B0",
    hero_bg:"linear-gradient(135deg,#1A0018,#280028)",   logo_c1:"#E20074", logo_c2:"#FF60B0", err_bg:"#3A0010",
    cond_neg:"#FF4D06", cond_warn:"#FFB800", cond_gold:"#FFD700", cond_pos:"#60D080",
    name:"MagentaTV",
  },
  // ── iOS / Apple Light ────────────────────────────────────────────────────
  ios: {
    bg:"#F2F2F7", surf:"#FFFFFF", surf2:"#E5E5EA",
    bd:"rgba(60,60,67,0.12)", bds:"rgba(60,60,67,0.25)",
    txt:"#000000", txt2:"rgba(60,60,67,0.55)",
    blue:"#007AFF", pos:"#1D7A36", neg:"#FF3B30", gold:"#FF9500",
    lbl:"rgba(60,60,67,0.45)",
    vorm_bg:"#FFF3E0", vorm_bd:"rgba(255,149,0,0.55)",
    cf:"#FF6B00", mid:"#007AFF",
    on_accent:"#FFFFFF", disabled:"#C7C7CC",
    warn:"#FF9500", override:"#CC7A00",
    cell_inc:"#1D7A36", cell_inc_bg:"#E8F9ED", cell_inc_bd:"#A8E8B8",
    tab_exp:"#FFE8E8", tab_inc:"#E8F9ED", tab_pend:"#FFF3E0",
    surf3:"#EFEFF4", err:"#FF3B30",
    pal_inc_bg:"#E8F9ED", pal_inc_bd:"#A8E8B8", pal_inc_hdr:"#1A8C34", pal_inc_fld:"#D8F5E0", pal_inc_val:"#0A6020",
    pal_exp_bg:"#FFE8E8", pal_exp_bd:"#F0A8A8", pal_exp_fld:"#FFD8D8",
    pal_tg_bg:"#E8F4FF", pal_tg_bd:"#A8D0F8", pal_tg_hdr:"#007AFF", pal_tg_fld:"#D8ECFF", pal_tg_val:"#0055CC",
    hero_bg:"linear-gradient(135deg,#E8F9ED,#C8F0D8)",   logo_c1:"#007AFF", logo_c2:"#1D7A36", err_bg:"#FFE0E0",
    cond_neg:"#FF3B30", cond_warn:"#FF9500", cond_gold:"#FFCC00", cond_pos:"#1D7A36",
    name:"iOS Light",
  },
  // ── Material Light (Google) ───────────────────────────────────────────────
  material: {
    bg:"#FAFAFA", surf:"#FFFFFF", surf2:"#F5F5F5",
    bd:"rgba(0,0,0,0.10)", bds:"rgba(0,0,0,0.22)",
    txt:"#212121", txt2:"rgba(0,0,0,0.50)",
    blue:"#1976D2", pos:"#388E3C", neg:"#D32F2F", gold:"#B85C00",
    lbl:"rgba(0,0,0,0.42)",
    vorm_bg:"#FFF8E1", vorm_bd:"rgba(245,124,0,0.50)",
    cf:"#E64A19", mid:"#0288D1",
    on_accent:"#FFFFFF", disabled:"#BDBDBD",
    warn:"#B85C00", override:"#BF360C",
    cell_inc:"#388E3C", cell_inc_bg:"#E8F5E9", cell_inc_bd:"#A5D6A7",
    tab_exp:"#FFEBEE", tab_inc:"#E8F5E9", tab_pend:"#FFF8E1",
    surf3:"#EEEEEE", err:"#D32F2F",
    pal_inc_bg:"#E8F5E9", pal_inc_bd:"#A5D6A7", pal_inc_hdr:"#2E7D32", pal_inc_fld:"#DCEDC8", pal_inc_val:"#1B5E20",
    pal_exp_bg:"#FFEBEE", pal_exp_bd:"#EF9A9A", pal_exp_fld:"#FFE0E0",
    pal_tg_bg:"#E3F2FD", pal_tg_bd:"#90CAF9", pal_tg_hdr:"#1976D2", pal_tg_fld:"#BBDEFB", pal_tg_val:"#0D47A1",
    hero_bg:"linear-gradient(135deg,#E8F5E9,#C8E6C9)",   logo_c1:"#1976D2", logo_c2:"#388E3C", err_bg:"#FFEBEE",
    cond_neg:"#D32F2F", cond_warn:"#F57C00", cond_gold:"#FBC02D", cond_pos:"#388E3C",
    name:"Material Light",
  },
  // ── Papier / Warm White ───────────────────────────────────────────────────
  paper: {
    bg:"#F8F4EE", surf:"#FFFDF8", surf2:"#F0EBE0",
    bd:"rgba(80,60,30,0.12)", bds:"rgba(80,60,30,0.25)",
    txt:"#2C1F0E", txt2:"rgba(80,60,30,0.50)",
    blue:"#5C4A1E", pos:"#3A7A3A", neg:"#B03020", gold:"#A07010",
    lbl:"rgba(80,60,30,0.42)",
    vorm_bg:"#FFF5DC", vorm_bd:"rgba(160,112,16,0.50)",
    cf:"#C05C10", mid:"#4A7A9A",
    on_accent:"#FFFDF8", disabled:"#C8BEA8",
    warn:"#A07010", override:"#804A00",
    cell_inc:"#3A7A3A", cell_inc_bg:"#EEF5EE", cell_inc_bd:"#A8C8A8",
    tab_exp:"#F8EEEC", tab_inc:"#EEF5EE", tab_pend:"#FFF5DC",
    surf3:"#EDE8DF", err:"#B03020",
    pal_inc_bg:"#EEF5EE", pal_inc_bd:"#A8C8A8", pal_inc_hdr:"#2A5A2A", pal_inc_fld:"#E0EEE0", pal_inc_val:"#1A401A",
    pal_exp_bg:"#F8EEEC", pal_exp_bd:"#E0A898", pal_exp_fld:"#F0E0DC",
    pal_tg_bg:"#EEF2F8", pal_tg_bd:"#A8B8D0", pal_tg_hdr:"#4A6A9A", pal_tg_fld:"#E0E8F4", pal_tg_val:"#2A4A7A",
    hero_bg:"linear-gradient(135deg,#EEF5EE,#E0EEE0)",   logo_c1:"#5C4A1E", logo_c2:"#3A7A3A", err_bg:"#F8EEEC",
    cond_neg:"#B03020", cond_warn:"#A07010", cond_gold:"#C8960C", cond_pos:"#3A7A3A",
    name:"Papier",
  },

  // ── DKB Banking App (hell, wie die echte App) ────────────────────────────
  dkb: {
    bg:"#E8EEF4",        // Entsättigtes Hellblau — DKB App Hintergrund
    surf:"#FFFFFF",      // Weiße Karten / Hero-Cards
    surf2:"#D8E4EE",     // Info-Hero: etwas dunkleres entsättigtes Hellblau
    surf3:"#EDF2F7",     // Leicht abgehobene Fläche
    bd:"#DDE6EF",        // Klare helle Rahmen
    bds:"#B8CAD8",       // Stärkerer Rahmen
    txt:"#0D1520",       // Fast Schwarz für Haupttext
    txt2:"#5A6E80",      // Hellgrau für Sekundärtext
    blue:"#003F7E",      // DKB-Primärblau
    pos:"#1A5C2A",       // Dunkelgrün
    neg:"#C0311A",       // Gedämpftes Rot
    gold:"#8A6800",      // Gedämpftes Amber
    lbl:"#7A8E9E",
    vorm_bg:"#FFF8E0",   vorm_bd:"#C8960A",
    cf:"#003F7E",        mid:"#1A5C2A",
    on_accent:"#FFFFFF", disabled:"#C0CDD8",
    warn:"#8A6800",      override:"#6A4E00",
    cell_inc:"#1A5C2A",  cell_inc_bg:"#D4EAD8", cell_inc_bd:"#8EC89A",
    tab_exp:"#FAEAE8",   tab_inc:"#E0EED8",    tab_pend:"#FFF3D0",
    err:"#C0311A",
    pal_inc_bg:"#E0EED8", pal_inc_bd:"#9EC8AA", pal_inc_hdr:"#1A5C2A", pal_inc_fld:"#D0E8D8", pal_inc_val:"#0D3818",
    pal_exp_bg:"#FAEAE8", pal_exp_bd:"#E8B0A8", pal_exp_fld:"#F4D8D4",
    pal_tg_bg:"#DCE8F4",  pal_tg_bd:"#98BAD8",  pal_tg_hdr:"#003F7E",  pal_tg_fld:"#CCE0EE",  pal_tg_val:"#00285A",
    hero_bg:"linear-gradient(135deg,#D8E4EE,#E8EEF4)", logo_c1:"#003F7E", logo_c2:"#0060C0", err_bg:"#FAE0DC",
    cond_neg:"#C0311A", cond_warn:"#8A6800", cond_gold:"#A07800", cond_pos:"#1A5C2A",
    name:"DKB Hell",
  },

  // ── Obsidian — Tiefes Dunkel, elektrische Akzente, maximale Lesbarkeit ───────
  obsidian: {
    name:"Obsidian",
    bg:"#0F1117",        // Fast-Schwarz mit Blauton
    surf:"#1C1F2E",      // Erhöhte Fläche — Mitternachtsblau
    surf2:"#252840",     // Noch höher — tiefes Blauviolett
    surf3:"#161927",     // Tiefer als bg
    bd:"#2E3356",        // Klare Trennlinie, kein Alpha
    bds:"#3D4470",       // Stärkere Trennlinie
    txt:"#F0F2FF",       // Fast-Weiß mit Kühle
    txt2:"#7B82B0",      // Gedimmtes Blaugrau
    lbl:"#5A6090",
    // Akzentfarbe: elektrisches Indigo
    blue:"#6C63FF",
    // Einnahmen: Smaragd
    pos:"#00D68F",
    cell_inc:"#00A770",  cell_inc_bg:"#00200F", cell_inc_bd:"#005030", cell_exp:"#FFE580", over:"#FF7EB6",
    // Ausgaben: Hellorange
    neg:"#FF4D06",
    // Gold/Warn: Bernstein
    gold:"#FFB547",
    warn:"#FFB547",      override:"#CC8800",
    // Buttons
    on_accent:"#FFFFFF", disabled:"#252840",
    // Vormerkungen: tiefes Bernstein
    vorm_bg:"#1F1500",   vorm_bd:"#CC8800",
    // Halbmonat-Label
    cf:"#6C63FF",        mid:"#00D68F",
    // Tabs
    tab_exp:"#2A0A10",   tab_inc:"#001F12",    tab_pend:"#1A1000",
    // Panels
    pal_inc_bg:"#001912", pal_inc_bd:"#005030", pal_inc_hdr:"#00D68F", pal_inc_fld:"#001510", pal_inc_val:"#33FFB8",
    pal_exp_bg:"#1A0810", pal_exp_bd:"#5A1030", pal_exp_fld:"#150508",
    pal_tg_bg:"#0D1030",  pal_tg_bd:"#2E3356",  pal_tg_hdr:"#6C63FF",  pal_tg_fld:"#0A0D25",  pal_tg_val:"#A09CFF",
    // Hero
    hero_bg:"linear-gradient(135deg,#0F1117,#1C1F2E)",
    logo_c1:"#4A42CC",   logo_c2:"#6C63FF",
    err:"#FF5370",       err_bg:"#250510",
    cond_neg:"#FF4D06",  cond_warn:"#FFB547",  cond_gold:"#FFD166",  cond_pos:"#00D68F",
  },

  // ── Sand — Warmes Hellthema, erdige Töne, maximale Lesbarkeit ────────────────
  sand: {
    name:"Sand",
    bg:"#F5F0E8",        // Warmes Off-White
    surf:"#FFFFFF",      // Karten: reines Weiß
    surf2:"#EDE8DF",     // Leicht vertieft
    surf3:"#F9F6F0",
    bd:"#DDD5C8",        // Warmer Sandton
    bds:"#C4B8A8",
    txt:"#1A1410",       // Tiefes Warmbraun
    txt2:"#7A6E62",      // Gedimmtes Braun
    lbl:"#9A8E82",
    blue:"#6B4FBF",      // Tiefes Violett — Akzent
    pos:"#1A7A4A",       // Sattgrün
    cell_inc:"#1A7A4A",  cell_inc_bg:"#E8F5EE", cell_inc_bd:"#A0CEB4",
    neg:"#C0391A",       // Terrakotta-Rot
    gold:"#8A5A00",      // Dunkles Amber
    warn:"#8A5A00",      override:"#5A3A00",
    on_accent:"#FFFFFF", disabled:"#D8D0C4",
    vorm_bg:"#FFF3D8",   vorm_bd:"#B07800",
    cf:"#6B4FBF",        mid:"#1A7A4A",
    tab_exp:"#FAE8E0",   tab_inc:"#E8F5EE",    tab_pend:"#FFF3D8",
    pal_inc_bg:"#E8F5EE", pal_inc_bd:"#A0CEB4", pal_inc_hdr:"#1A7A4A", pal_inc_fld:"#D8EEE4", pal_inc_val:"#0D4A2A",
    pal_exp_bg:"#FAE8E0", pal_exp_bd:"#D4A090", pal_exp_fld:"#F5DDD5",
    pal_tg_bg:"#EDE8F8",  pal_tg_bd:"#B4A0DC",  pal_tg_hdr:"#6B4FBF",  pal_tg_fld:"#E4DEFC",  pal_tg_val:"#4A30A0",
    hero_bg:"linear-gradient(135deg,#EDE8DF,#F5F0E8)",
    logo_c1:"#4A30A0",   logo_c2:"#6B4FBF",
    err:"#C0391A",       err_bg:"#FAE8E0",
    cond_neg:"#C0391A",  cond_warn:"#8A5A00",  cond_gold:"#A07000",  cond_pos:"#1A7A4A",
  },

  // ── Clean — Minimalistisch, kein Schnörkel, reines SW ───────────────────
  clean: {
    name:"Clean",
    bg:"#FFFFFF",
    surf:"#F5F5F5",
    surf2:"#EBEBEB",
    surf3:"#F0F0F0",
    bd:"#CCCCCC",
    bds:"#999999",
    txt:"#000000",
    txt2:"#555555",
    lbl:"#777777",
    blue:"#0066CC",
    pos:"#006600",
    neg:"#CC0000",
    gold:"#886600",
    warn:"#886600",   override:"#664400",
    on_accent:"#FFFFFF", disabled:"#CCCCCC",
    cell_inc:"#006600",  cell_inc_bg:"#EEFFEE", cell_inc_bd:"#99CC99",
    tab_exp:"#FFEEEE",   tab_inc:"#EEFFEE",    tab_pend:"#FFFFEE",
    vorm_bg:"#FFFFF0",   vorm_bd:"#AAAAAA",
    cf:"#0066CC",        mid:"#006699",
    pal_inc_bg:"#EEFFEE", pal_inc_bd:"#99CC99", pal_inc_hdr:"#006600", pal_inc_fld:"#E0FFE0", pal_inc_val:"#003300",
    pal_exp_bg:"#FFEEEE", pal_exp_bd:"#CC9999", pal_exp_fld:"#FFE0E0",
    pal_tg_bg:"#EEF4FF",  pal_tg_bd:"#99BBEE",  pal_tg_hdr:"#0066CC",  pal_tg_fld:"#E0EEFF",  pal_tg_val:"#003399",
    hero_bg:"#F5F5F5",
    logo_c1:"#333333",   logo_c2:"#000000",
    err:"#CC0000",       err_bg:"#FFEEEE",
    cond_neg:"#CC0000",  cond_warn:"#886600",  cond_gold:"#886600",  cond_pos:"#006600",
  },

  // ── Brutalist / Anti-Design ───────────────────────────────────────────────
  brutalist: {
    name:"Brutalist",
    bg:"#FFEC3E",
    surf:"#FFFFFF",
    surf2:"#F5E800",
    surf3:"#FFF8A0",
    bd:"#000000",
    bds:"#000000",
    txt:"#000000",
    txt2:"#333333",
    lbl:"#444444",
    blue:"#000000",
    pos:"#000000",
    neg:"#CC0000",
    gold:"#000000",
    warn:"#CC0000",   override:"#880000",
    on_accent:"#FFEC3E", disabled:"#CCCCCC",
    cell_inc:"#000000",  cell_inc_bg:"#CCFFCC", cell_inc_bd:"#000000",
    tab_exp:"#FFCCCC",   tab_inc:"#CCFFCC",    tab_pend:"#FFF8A0",
    vorm_bg:"#FFF8A0",   vorm_bd:"#000000",
    cf:"#000000",        mid:"#000000",
    pal_inc_bg:"#CCFFCC", pal_inc_bd:"#000000", pal_inc_hdr:"#000000", pal_inc_fld:"#BBFFBB", pal_inc_val:"#000000",
    pal_exp_bg:"#FFCCCC", pal_exp_bd:"#000000", pal_exp_fld:"#FFBBBB",
    pal_tg_bg:"#E8F4FF",  pal_tg_bd:"#000000",  pal_tg_hdr:"#000000",  pal_tg_fld:"#D0EAFF",  pal_tg_val:"#000000",
    hero_bg:"#FFEC3E",
    logo_c1:"#000000",   logo_c2:"#333333",
    err:"#CC0000",       err_bg:"#FFCCCC",
    cond_neg:"#CC0000",  cond_warn:"#884400",  cond_gold:"#664400",  cond_pos:"#006600",
  },

  // ── Terminal / Hacker ─────────────────────────────────────────────────────
  terminal: {
    name:"Terminal",
    bg:"#0D0D0D",
    surf:"#111111",
    surf2:"#1A1A1A",
    surf3:"#0A0A0A",
    bd:"#00FF4133",
    bds:"#00FF4166",
    txt:"#00FF41",
    txt2:"#00AA2A",
    lbl:"#007A1E",
    blue:"#00FF41",
    pos:"#00FF41",
    neg:"#FF4D06",
    gold:"#FFD700",
    warn:"#FFD700",   override:"#CC9900",
    on_accent:"#0D0D0D", disabled:"#1A1A1A",
    cell_inc:"#00C733",  cell_inc_bg:"#001A00", cell_inc_bd:"#005500", cell_exp:"#FFE580", over:"#FF7EB6",
    tab_exp:"#1A0000",   tab_inc:"#001A00",    tab_pend:"#1A1400",
    vorm_bg:"#1A1400",   vorm_bd:"#FFD70066",
    cf:"#00FF41",        mid:"#00CCFF",
    pal_inc_bg:"#001A00", pal_inc_bd:"#005500", pal_inc_hdr:"#00FF41", pal_inc_fld:"#002200", pal_inc_val:"#44FF66",
    pal_exp_bg:"#1A0000", pal_exp_bd:"#660000", pal_exp_fld:"#220000",
    pal_tg_bg:"#001A1A",  pal_tg_bd:"#005555",  pal_tg_hdr:"#00CCFF",  pal_tg_fld:"#002222",  pal_tg_val:"#44DDFF",
    hero_bg:"#0D0D0D",
    logo_c1:"#007A1E",   logo_c2:"#00FF41",
    err:"#FF4444",       err_bg:"#1A0000",
    cond_neg:"#FF4D06",  cond_warn:"#FFD700",  cond_gold:"#FFD700",  cond_pos:"#00FF41",
  },

  // ── Swiss / International Style ───────────────────────────────────────────
  swiss: {
    name:"Swiss",
    bg:"#FFFFFF",
    surf:"#FAFAFA",
    surf2:"#F0F0F0",
    surf3:"#F8F8F8",
    bd:"#DDDDDD",
    bds:"#AAAAAA",
    txt:"#111111",
    txt2:"#777777",
    lbl:"#999999",
    blue:"#111111",
    pos:"#111111",
    neg:"#111111",
    gold:"#555555",
    warn:"#555555",   override:"#333333",
    on_accent:"#FFFFFF", disabled:"#CCCCCC",
    cell_inc:"#111111",  cell_inc_bg:"#F0F0F0", cell_inc_bd:"#AAAAAA",
    tab_exp:"#F5F5F5",   tab_inc:"#F0F0F0",    tab_pend:"#F8F8F8",
    vorm_bg:"#F0F0F0",   vorm_bd:"#AAAAAA",
    cf:"#111111",        mid:"#555555",
    pal_inc_bg:"#F0F0F0", pal_inc_bd:"#AAAAAA", pal_inc_hdr:"#111111", pal_inc_fld:"#E8E8E8", pal_inc_val:"#111111",
    pal_exp_bg:"#F5F5F5", pal_exp_bd:"#AAAAAA", pal_exp_fld:"#EEEEEE",
    pal_tg_bg:"#F0F0F0",  pal_tg_bd:"#AAAAAA",  pal_tg_hdr:"#111111",  pal_tg_fld:"#E8E8E8",  pal_tg_val:"#111111",
    hero_bg:"#FFFFFF",
    logo_c1:"#555555",   logo_c2:"#111111",
    err:"#111111",       err_bg:"#F5F5F5",
    cond_neg:"#111111",  cond_warn:"#555555",  cond_gold:"#555555",  cond_pos:"#111111",
  },

  // ── Keyboard / Tastatur-inspiriert ─────────────────────────────────────────
  // Korrigiert nach genauer Screenshot-Analyse: Tasten sind HELL genug, dass
  // schwarzer Text + leuchtend gelbgrüne Großbuchstaben gut lesbar sind.
  // Hierarchie wie auf der echten Tastatur:
  //   - App-BG (Installer-Fenster):  #2D2D33  dunkles Anthrazit
  //   - Tastatur-Rahmen (Strich):    #E8E8E0  fast-weiß
  //   - Zwischen den Tasten:         #4A4A48  mittel-dunkel
  //   - Tastenflächen (=Karten):     #B8B8B0  helles Grau (Sand-ähnlich)
  //   - Text auf Tasten:             #1A1A18  schwarz (wie Kleinbuchstaben)
  //   - Akzent:                      #D4E834  gelbgrün (Großbuchstaben)
  //   - Petrol:                      #2D5A78  (Selektions-Highlight)
  keyboard: {
    name:"Keyboard",
    bg:"#6A6A64",                // App-BG = Installer-Hintergrund (aufgehellt — war zu dunkel
                                 // für den fast-schwarzen Text, der auf Bildschirm-Titeln direkt
                                 // auf dem Hintergrund liegt, siehe Kontrast-Audit)
    surf:"#B8B8B0",              // Karten = Tastenflächen (HELL, schwarzer Text drauf)
    surf2:"#A8A8A0",             // leicht dunkler (Modals etc.)
    surf3:"#9A9A95",             // dunklere Variante (Trennungen)
    cat_bg:"#B8B8B0",            // Kategorien-Karten = Tasten-Hell
    bd:"rgba(40,40,38,0.45)",        // Tasten-Rahmen-Kanten
    bds:"rgba(40,40,38,0.75)",       // stärker
    txt:"#1A1A18",               // schwarzer Text auf den hellen Tasten
    txt2:"rgba(30,30,28,0.65)",  // gedämpfter Text
    lbl:"rgba(30,30,28,0.50)",   // Labels
    blue:"#2C3406",              // sattes Olivgrün als Hauptakzent — abgedunkelt, damit es
                                 // auch auf dem (hellgrauen) App-BG noch lesbar bleibt
    pos:"#2C3406",               // Einnahmen-Grün
    neg:"#5C1611",               // sattes Rot (auf hell gut sichtbar) — abgedunkelt s.o.
    gold:"#553800",              // dunkler Bernstein — abgedunkelt s.o.
    warn:"#A0541A",
    override:"#7A3A00",
    on_accent:"#FFFFFF",         // weißer Text auf Accent-Buttons
    disabled:"#888880",
    mid:"#1F4060",               // tiefes Petrol-Blau (für Mitte/Tagesgeld)
    cf:"#B0501A",
    vorm_bg:"#F0E0B0",   vorm_bd:"rgba(140,100,0,0.7)",
    cell_inc:"#4A5810",  cell_inc_bg:"rgba(212,232,52,0.32)", cell_inc_bd:"#8FA821",
    tab_exp:"rgba(168,40,32,0.18)",   tab_inc:"rgba(212,232,52,0.32)",     tab_pend:"rgba(180,130,0,0.20)",
    pal_inc_bg:"#D4E07A",  pal_inc_bd:"#A0B82A",  pal_inc_hdr:"#3A4A00",  pal_inc_fld:"#C8D670",  pal_inc_val:"#2A3500",
    pal_exp_bg:"#E8C0B8",  pal_exp_bd:"#A82820",  pal_exp_fld:"#DCB0A8",  /* fld für Eingabefeld in Ausgaben-Palette */
    pal_tg_bg:"#A8C8DC",   pal_tg_bd:"#1F4060",   pal_tg_hdr:"#0A2540",   pal_tg_fld:"#90B8D0",   pal_tg_val:"#0A2540",
    hero_bg:"linear-gradient(135deg,#C8C8C0,#A8A8A0)",
    logo_c1:"#3A4A00",     logo_c2:"#D4E834",
    err:"#A82820",         err_bg:"rgba(168,40,32,0.18)",
    cond_neg:"#A82820",    cond_warn:"#8B5A00",   cond_gold:"#8B5A00",   cond_pos:"#5A6B14",
  },

};

// ── Dark Hell — wie Dark, aber mit DEUTLICH hellerem Grau, damit das
//    Ausgaben-Rot besser lesbar ist. Umschaltbare Variante; wenn sie sich
//    bewährt, kann sie das bisherige Dark ablösen.
THEMES.darkhell = {
  ...THEMES.dark,
  bg:"#3E444C", surf:"#4B525B", surf2:"#545C66", surf3:"#3A414A",
  bd:"rgba(215,225,235,0.20)", bds:"rgba(215,225,235,0.34)",
  txt:"#F5F7F9", txt2:"rgba(218,228,238,0.72)",
  lbl:"rgba(218,228,238,0.58)",
  neg:"#FF4D06",                       // Hellorange — bessere Lesbarkeit auf Grau
  err:"#FFA090", cond_neg:"#FF4D06",
  disabled:"#3A4046",
  hero_bg:"linear-gradient(135deg,#262B32,#363E48)",
  name:"Dark Hell (helleres Grau)",
};

// ── Hellgrau — echtes helles Neutralgrau als Hintergrund, weiße Karten,
//    dunkler Text. Basiert auf dem (für helle Gründe abgestimmten) Light-Theme;
//    Ausgaben in sattem, dunklem Rot (#CC2B1D), das auf Hell ruhig & klar liest.
THEMES.hellgrau = {
  ...THEMES.light,
  bg:"#DBDFE4",          // klares helles Neutralgrau
  surf:"#FFFFFF",        // weiße Karten heben sich ab
  surf2:"#E9ECF0",
  surf3:"#E3E6EB",
  bd:"rgba(45,55,70,0.16)", bds:"rgba(45,55,70,0.30)",
  txt:"#1E232B",         // neutrales Fast-Schwarz
  txt2:"rgba(45,55,70,0.60)",
  lbl:"rgba(45,55,70,0.46)",
  pos:"#4D6E00",         // dunkleres Grün — auf dem satteren Grau-BG sonst zu blass
  neg:"#CC2B1D",         // sattes, dunkles Rot — ruhig lesbar auf Hell
  err:"#CC2B1D", cond_neg:"#C0392B", cond_pos:"#4D6E00",
  hero_bg:"linear-gradient(135deg,#CBD0D6,#DDE1E6)",
  name:"Hellgrau",
};

// ════════════════════════════════════════════════════════════════════════
//  Hoch lesbare Farbkombinationen (maximaler Kontrast, klar getrennte Akzente)
// ════════════════════════════════════════════════════════════════════════

// ── Kontrast Dunkel — reines Schwarz, weiße Schrift, klar getrennte Akzente
//    (Blau/Grün/Rot). Maximale Lesbarkeit bei dunkler Umgebung.
THEMES.kontrastdunkel = {
  ...THEMES.dark,
  bg:"#000000", surf:"#141414", surf2:"#1F1F1F", surf3:"#0A0A0A",
  bd:"rgba(255,255,255,0.24)", bds:"rgba(255,255,255,0.44)",
  txt:"#FFFFFF", txt2:"rgba(255,255,255,0.82)", lbl:"rgba(255,255,255,0.64)",
  blue:"#5AB7FF", pos:"#3FD06A", neg:"#FF4D06", gold:"#FFC83D",
  on_accent:"#05140A", disabled:"#2A2A2A", warn:"#FFB02E", override:"#C2740A",
  mid:"#67E8F9",
  cell_inc:"#4AAF6C", cell_inc_bg:"#06160C", cell_inc_bd:"#1E5A33", cell_exp:"#FFE580", over:"#FF7EB6",
  tab_exp:"#3A0E0A", tab_inc:"#0C2A16", tab_pend:"#332300",
  err:"#FF6B5E", err_bg:"#3A0A0A",
  vorm_bg:"#332300", vorm_bd:"rgba(255,200,0,0.9)",
  pal_inc_bg:"#06160C", pal_inc_bd:"#1E5A33", pal_inc_hdr:"#3FD06A", pal_inc_fld:"#0A1F12", pal_inc_val:"#5FE08A",
  pal_exp_bg:"#200808", pal_exp_bd:"#5C1A14", pal_exp_fld:"#280A0A",
  pal_tg_bg:"#06121F", pal_tg_bd:"#1A3A55", pal_tg_hdr:"#5AB7FF", pal_tg_fld:"#0A1A2A", pal_tg_val:"#8FD0FF",
  hero_bg:"linear-gradient(135deg,#0A0A0A,#1C1C1C)", logo_c1:"#3FD06A", logo_c2:"#5AB7FF",
  cond_neg:"#FF4D06", cond_warn:"#FFA53D", cond_gold:"#FFD23D", cond_pos:"#3FD06A",
  name:"★ Kontrast Dunkel (Empfohlen)",
};

// ── Kontrast Hell — reines Weiß, fast schwarze Schrift, kräftige, dunkle
//    Akzente (Blau/Grün/Rot). Maximale Lesbarkeit bei heller Umgebung.
THEMES.kontrasthell = {
  ...THEMES.light,
  bg:"#FFFFFF", surf:"#FFFFFF", surf2:"#EEF1F5", surf3:"#E6EAEF",
  bd:"rgba(0,0,0,0.22)", bds:"rgba(0,0,0,0.42)",
  txt:"#000000", txt2:"rgba(0,0,0,0.74)", lbl:"rgba(0,0,0,0.56)",
  blue:"#1565C0", pos:"#1B7A33", neg:"#C62012", gold:"#A65A00",
  on_accent:"#FFFFFF", disabled:"#C8CCD2", warn:"#9A5400", override:"#7A4300",
  mid:"#0E6E94",
  cell_inc:"#1B7A33", cell_inc_bg:"#E6F4E6", cell_inc_bd:"#8FC79A",
  tab_exp:"#FBE2DF", tab_inc:"#E4F3E4", tab_pend:"#FBF0D0",
  err:"#C62012", err_bg:"#FBDED9",
  vorm_bg:"#FFF1CC", vorm_bd:"rgba(160,110,0,0.7)",
  pal_inc_bg:"#EAF6EA", pal_inc_bd:"#A7CFA7", pal_inc_hdr:"#1B7A33", pal_inc_fld:"#E0F0E0", pal_inc_val:"#155C28",
  pal_exp_bg:"#FBEAE7", pal_exp_bd:"#E0A59C", pal_exp_fld:"#F8DED9",
  pal_tg_bg:"#E7F0FA", pal_tg_bd:"#A6C4E6", pal_tg_hdr:"#1565C0", pal_tg_fld:"#DCEAF8", pal_tg_val:"#0D4C95",
  hero_bg:"linear-gradient(135deg,#E6EAEF,#FFFFFF)", logo_c1:"#1B7A33", logo_c2:"#1565C0",
  cond_neg:"#C62012", cond_warn:"#B45309", cond_gold:"#B8860B", cond_pos:"#1B7A33",
  name:"★ Kontrast Hell (Empfohlen)",
};

// ── Mitternacht Blau — tiefes Marineblau, ruhige helle Schrift. Augenschonend
//    und trotzdem klar lesbar.
THEMES.mitternacht = {
  ...THEMES.dark,
  bg:"#0F1626", surf:"#18223A", surf2:"#1F2B47", surf3:"#0C1220",
  bd:"rgba(170,195,235,0.20)", bds:"rgba(170,195,235,0.36)",
  txt:"#EAF1FF", txt2:"rgba(200,215,245,0.74)", lbl:"rgba(200,215,245,0.56)",
  blue:"#6CB4FF", pos:"#4FD08A", neg:"#FF4D06", gold:"#FFC861",
  on_accent:"#08101F", mid:"#67E8F9",
  cell_inc:"#4AAF7D", cell_inc_bg:"#08200F", cell_inc_bd:"#1E5A3A", cell_exp:"#FFE580", over:"#FF7EB6",
  tab_exp:"#3A1015", tab_inc:"#0C2A1A", tab_pend:"#33260A",
  err:"#FF6F61", err_bg:"#33101A",
  hero_bg:"linear-gradient(135deg,#0C1220,#1A2742)", logo_c1:"#4FD08A", logo_c2:"#6CB4FF",
  cond_neg:"#FF4D06", cond_warn:"#FFA552", cond_gold:"#FFD263", cond_pos:"#4FD08A",
  name:"Mitternacht Blau",
};

// ── Creme — warmes Off-White, dunkelbrauner Text. Ruhig, augenschonend,
//    gut lesbar.
THEMES.creme = {
  ...THEMES.light,
  bg:"#F5F0E6", surf:"#FFFDF8", surf2:"#EDE6D6", surf3:"#E8E0CE",
  bd:"rgba(90,70,40,0.18)", bds:"rgba(90,70,40,0.34)",
  txt:"#2A2418", txt2:"rgba(80,65,40,0.64)", lbl:"rgba(80,65,40,0.48)",
  blue:"#1F6FB2", pos:"#2E7D32", neg:"#C0341F", gold:"#B07400",
  on_accent:"#FFFFFF", mid:"#1E6E90",
  cell_inc:"#2E7D32", cell_inc_bg:"#EAF3E2", cell_inc_bd:"#9FC79A",
  tab_exp:"#F7E2DC", tab_inc:"#EAF3DE", tab_pend:"#F7EFD6",
  err:"#C0341F", err_bg:"#F7DED8",
  hero_bg:"linear-gradient(135deg,#E8E0CE,#F7F2E8)", logo_c1:"#2E7D32", logo_c2:"#1F6FB2",
  cond_neg:"#C0341F", cond_warn:"#C2730A", cond_gold:"#B8860B", cond_pos:"#2E7D32",
  name:"Creme",
};

// ════════════════════════════════════════════════════════════════════════
//  Zusätzliche UI-Designs (kuratierte Paletten). Light-Mode-Grün bewusst dunkel
//  genug für WCAG 4.5:1 (kleine farbige Beträge müssen lesbar bleiben).
// ════════════════════════════════════════════════════════════════════════

// ── Modern Slate — neutrales Schiefergrau, weiße Schrift, Lime-Akzent ───────
THEMES.modernslate = {
  ...THEMES.dark,
  bg:"#1E222B", surf:"#282D37", surf2:"#313742", surf3:"#181B22",
  bd:"rgba(255,255,255,0.12)", bds:"rgba(255,255,255,0.24)",
  txt:"#FFFFFF", txt2:"#9098AC", lbl:"#727A90",
  blue:"#5B9DF9", pos:"#A3E635", neg:"#FF4D06", gold:"#FBBF24",
  on_accent:"#0C1206", disabled:"#2A2F3A", warn:"#FBBF24", override:"#B5830F",
  mid:"#67E8F9",
  cell_inc:"#7FB329", cell_inc_bg:"#18200A", cell_inc_bd:"#4A6612", cell_exp:"#FFE580", over:"#FF7EB6",
  tab_exp:"#3A1414", tab_inc:"#1E2A0A", tab_pend:"#332A0A",
  err:"#FF4D4D", err_bg:"#350F0F",
  vorm_bg:"#332A0A", vorm_bd:"rgba(251,191,36,0.85)",
  pal_inc_bg:"#18200A", pal_inc_bd:"#4A6612", pal_inc_hdr:"#A3E635", pal_inc_fld:"#1E280C", pal_inc_val:"#B6F24D",
  pal_exp_bg:"#2A0E0E", pal_exp_bd:"#5C1A1A", pal_exp_fld:"#330F0F",
  pal_tg_bg:"#0E1B2E", pal_tg_bd:"#1E3A5C", pal_tg_hdr:"#5B9DF9", pal_tg_fld:"#0C1A2A", pal_tg_val:"#9CC9FF",
  hero_bg:"linear-gradient(135deg,#181B22,#282D37)", logo_c1:"#6FA80F", logo_c2:"#A3E635",
  cond_neg:"#FF4D06", cond_warn:"#FBBF24", cond_gold:"#FCD34D", cond_pos:"#A3E635",
  name:"Modern Slate",
};

// ── Clean Corporate — sehr helles Blaugrau, dunkles Marineblau-Schwarz,
//    klares Geschäftsblau. Grün WCAG-sicher abgedunkelt.
THEMES.cleancorporate = {
  ...THEMES.light,
  bg:"#F8FAFC", surf:"#FFFFFF", surf2:"#EEF2F6", surf3:"#E6EBF1",
  bd:"rgba(15,23,42,0.12)", bds:"rgba(15,23,42,0.24)",
  txt:"#0F172A", txt2:"#64748B", lbl:"#7E8B9E",
  blue:"#2563EB", pos:"#3C8200", neg:"#D6001C", gold:"#B45309",
  on_accent:"#FFFFFF", disabled:"#C8D0DA", warn:"#B45309", override:"#7A4300",
  mid:"#0E6E94",
  cell_inc:"#3C8200", cell_inc_bg:"#EEF7E0", cell_inc_bd:"#A8CE78",
  tab_exp:"#FBE4E6", tab_inc:"#EEF7E0", tab_pend:"#FBF1DD",
  err:"#D6001C", err_bg:"#FBDEE1",
  vorm_bg:"#FFF3D6", vorm_bd:"rgba(180,83,9,0.6)",
  pal_inc_bg:"#EEF7E0", pal_inc_bd:"#A8CE78", pal_inc_hdr:"#3C8200", pal_inc_fld:"#E4F2D2", pal_inc_val:"#2E5E00",
  pal_exp_bg:"#FBE6E8", pal_exp_bd:"#E5A6AE", pal_exp_fld:"#F8D8DC",
  pal_tg_bg:"#E7EEFB", pal_tg_bd:"#A8C0EC", pal_tg_hdr:"#2563EB", pal_tg_fld:"#DCE6F8", pal_tg_val:"#1A47B0",
  hero_bg:"linear-gradient(135deg,#EEF2F6,#FFFFFF)", logo_c1:"#3C8200", logo_c2:"#2563EB",
  cond_neg:"#D6001C", cond_warn:"#B45309", cond_gold:"#B8860B", cond_pos:"#3C8200",
  name:"Clean Corporate",
};

// ── Deep Ocean — tiefes Marineblau, helle Schrift, Cyan-Akzent, Chartreuse-Grün
THEMES.deepocean = {
  ...THEMES.dark,
  // Helles Anthrazit (gleiche Helligkeit wie "Dark Hell"), damit das iPhone
  // bei dunklem Hintergrund nicht spiegelt und Text gut lesbar bleibt.
  bg:"#3E444C", surf:"#4B525B", surf2:"#545C66", surf3:"#3A414A",
  bd:"rgba(150,180,220,0.18)", bds:"rgba(150,180,220,0.34)",
  txt:"#F4F6F9", txt2:"rgba(200,215,240,0.72)", lbl:"rgba(200,215,240,0.54)",
  // blue/neg gegenüber surf2 (#545C66) aufgehellt (3.5:1/3.2:1 → 4.5:1+ WCAG-
  // Kontrast) — bei kleiner Schrift (Badges, Tags) war die vorige, dunklere
  // Fassung auf diesem mittleren Grau kaum zu erkennen. neg jetzt Hellorange
  // (#FF4D06) statt Rot — deutlich bessere Lesbarkeit im Dark Theme, klar
  // unterscheidbar vom separaten err-Ton.
  blue:"#65E3FD", pos:"#BFFF00", neg:"#FF4D06", gold:"#FFC861",
  on_accent:"#06121A", disabled:"#3A414A", warn:"#FFB54A", override:"#C2820F",
  mid:"#67E8F9",
  cell_inc:"#95C700", cell_inc_bg:"#141F00", cell_inc_bd:"#4A6600", cell_exp:"#FFE580", over:"#FF7EB6",
  tab_exp:"#3A1010", tab_inc:"#1C2A00", tab_pend:"#332600",
  err:"#FF5252", err_bg:"#350E0E",
  vorm_bg:"#332600", vorm_bd:"rgba(255,200,97,0.8)",
  pal_inc_bg:"#141F00", pal_inc_bd:"#4A6600", pal_inc_hdr:"#BFFF00", pal_inc_fld:"#1A2600", pal_inc_val:"#D4FF4D",
  pal_exp_bg:"#2A0C0C", pal_exp_bd:"#5C1818", pal_exp_fld:"#330E0E",
  pal_tg_bg:"#0A1B2E", pal_tg_bd:"#1A4658", pal_tg_hdr:"#48CAE4", pal_tg_fld:"#08182A", pal_tg_val:"#8AE0F0",
  hero_bg:"linear-gradient(135deg,#2A2F36,#4B525B)", logo_c1:"#6FA800", logo_c2:"#BFFF00",
  cond_neg:"#FF4D06", cond_warn:"#FFB54A", cond_gold:"#FFD263", cond_pos:"#BFFF00",
  name:"Deep Ocean",
};

// ── Soft Eco-Tech — warmes helles Grau, dunkler Text, freundliches Teal,
//    natürliches Grün (WCAG-sicher abgedunkelt).
THEMES.softecotech = {
  ...THEMES.light,
  bg:"#F4F4F2", surf:"#FFFFFF", surf2:"#EAEAE6", surf3:"#E3E3DE",
  bd:"rgba(26,28,30,0.12)", bds:"rgba(26,28,30,0.24)",
  txt:"#1A1C1E", txt2:"#5E6568", lbl:"#80878A",
  blue:"#1F8A7A", pos:"#3A8000", neg:"#DE2129", gold:"#A66A00",
  on_accent:"#FFFFFF", disabled:"#CBCBC6", warn:"#A66A00", override:"#7A4D00",
  mid:"#1E7E90",
  cell_inc:"#3A8000", cell_inc_bg:"#EAF3DE", cell_inc_bd:"#A6CC80",
  tab_exp:"#FBE2E3", tab_inc:"#EAF3DE", tab_pend:"#F8EFDA",
  err:"#DE2129", err_bg:"#FBDFE0",
  vorm_bg:"#F8EFD6", vorm_bd:"rgba(166,106,0,0.6)",
  pal_inc_bg:"#EAF3DE", pal_inc_bd:"#A6CC80", pal_inc_hdr:"#357500", pal_inc_fld:"#E0EECF", pal_inc_val:"#275600",
  pal_exp_bg:"#FBE4E5", pal_exp_bd:"#E8A6A9", pal_exp_fld:"#F8D6D8",
  pal_tg_bg:"#E4F2EF", pal_tg_bd:"#A6D0C8", pal_tg_hdr:"#1F8A7A", pal_tg_fld:"#D8ECE7", pal_tg_val:"#14685B",
  hero_bg:"linear-gradient(135deg,#EAEAE6,#FFFFFF)", logo_c1:"#3A8000", logo_c2:"#1F8A7A",
  cond_neg:"#DE2129", cond_warn:"#A66A00", cond_gold:"#B8860B", cond_pos:"#3A8000",
  name:"Soft Eco-Tech",
};

// ════════════════════════════════════════════════════════════════════════
//  Kinder-Themes — verspielter für jüngere Nutzer, Zahlen bleiben klar
//  lesbar (Verspieltheit nur in Farben/Verläufen, nicht in der Typografie).
// ════════════════════════════════════════════════════════════════════════

// ── Abenteuer-Grün — warme Sand-/Olivtöne, wie ein Ausflug in den Wald ──
THEMES.abenteuergruen = {
  ...THEMES.light,
  bg:"#EFE8D2", surf:"#FBF6E8", surf2:"#E9DFC0", surf3:"#E1D5AD",
  bd:"rgba(70,60,20,0.16)", bds:"rgba(70,60,20,0.30)",
  txt:"#2E3620", txt2:"rgba(60,70,30,0.62)", lbl:"rgba(60,70,30,0.46)",
  blue:"#4F7A2E", pos:"#4F7A2E", neg:"#C0521F", gold:"#B8860A",
  on_accent:"#FFFFFF", disabled:"#CFC7AA", warn:"#B8860A", override:"#8A5A10",
  mid:"#2E7A8A",
  cell_inc:"#3E6B1F", cell_inc_bg:"#E4EFCF", cell_inc_bd:"#9FC26A",
  tab_exp:"#F5D9C2", tab_inc:"#DCEBC4", tab_pend:"#F5E9BE",
  err:"#C0521F", err_bg:"#F7DED0",
  vorm_bg:"#F5E9BE", vorm_bd:"rgba(184,134,10,0.6)",
  pal_inc_bg:"#EAF3D8", pal_inc_bd:"#A0C670", pal_inc_hdr:"#3E6B1F", pal_inc_fld:"#E0EEC8", pal_inc_val:"#2C4F14",
  pal_exp_bg:"#F9E4D6", pal_exp_bd:"#E3A47C", pal_exp_fld:"#F5D8C6",
  pal_tg_bg:"#DEEEF0", pal_tg_bd:"#7FBCC4", pal_tg_hdr:"#2E7A8A", pal_tg_fld:"#D2E8EA", pal_tg_val:"#1F5560",
  hero_bg:"linear-gradient(135deg,#7C9A55,#5E7C3E)",
  logo_c1:"#3E6B1F", logo_c2:"#8FB84A",
  cond_neg:"#C0521F", cond_warn:"#B8860A", cond_gold:"#A87400", cond_pos:"#3E6B1F",
  // Deko-Rahmen um den App-Inhalt (nur Kinder-Themes setzen das) + Icon-Set
  // für die Navigation, damit sich das Theme nicht nur über Farben zeigt.
  frame_border:"10px solid #6B8A45", frame_ring:"#FBF6E8",
  nav_icons:{ home:"trees", jahr:"compass", daten:"backpack" },
  name:"Abenteuer-Grün",
};

// ── Weltraum-Taschengeld — Mitternachtsblau mit Neon-Türkis/Pink, kleine
//    Sternpunkte im Hero-Verlauf ──────────────────────────────────────────
THEMES.weltraumtaschengeld = {
  ...THEMES.dark,
  bg:"#0B0F2A", surf:"#141A3D", surf2:"#1B2350", surf3:"#080B1E",
  bd:"rgba(140,170,255,0.20)", bds:"rgba(140,170,255,0.36)",
  txt:"#EAF2FF", txt2:"rgba(200,220,255,0.70)", lbl:"rgba(200,220,255,0.54)",
  blue:"#2EE6D6", pos:"#2EE6D6", neg:"#FF4D06", gold:"#FFD166",
  on_accent:"#04201C", disabled:"#232B55", warn:"#FFB84A", override:"#C77A2E",
  mid:"#8A7CFF",
  cell_inc:"#24B3A7", cell_inc_bg:"#062420", cell_inc_bd:"#1A6E63", cell_exp:"#FFE580", over:"#FF7EB6",
  tab_exp:"rgba(255,79,163,0.20)", tab_inc:"rgba(46,230,214,0.20)", tab_pend:"rgba(255,209,102,0.20)",
  err:"#FF4FA3", err_bg:"#33102A",
  vorm_bg:"#332A0A", vorm_bd:"rgba(255,209,102,0.85)",
  pal_inc_bg:"#062420", pal_inc_bd:"#1A6E63", pal_inc_hdr:"#2EE6D6", pal_inc_fld:"#082E28", pal_inc_val:"#7CF5E8",
  pal_exp_bg:"#2E0A20", pal_exp_bd:"#7A1F58", pal_exp_fld:"#380D28",
  pal_tg_bg:"#160F38", pal_tg_bd:"#4A3AA0", pal_tg_hdr:"#8A7CFF", pal_tg_fld:"#1C1348", pal_tg_val:"#C0B6FF",
  hero_bg:"radial-gradient(circle at 15% 22%, rgba(255,255,255,0.9) 0 1px, transparent 2px), "+
          "radial-gradient(circle at 68% 12%, rgba(255,255,255,0.7) 0 1px, transparent 2px), "+
          "radial-gradient(circle at 42% 68%, rgba(255,255,255,0.55) 0 1px, transparent 2px), "+
          "radial-gradient(circle at 86% 55%, rgba(255,255,255,0.8) 0 1px, transparent 2px), "+
          "radial-gradient(circle at 24% 85%, rgba(255,255,255,0.5) 0 1px, transparent 2px), "+
          "radial-gradient(circle at 55% 40%, rgba(255,255,255,0.4) 0 1px, transparent 2px), "+
          "linear-gradient(135deg,#0B0F2A,#1B2350)",
  logo_c1:"#2EE6D6", logo_c2:"#8A7CFF",
  cond_neg:"#FF4D06", cond_warn:"#FFB84A", cond_gold:"#FFD166", cond_pos:"#2EE6D6",
  frame_border:"9px solid #2EE6D6", frame_ring:"#8A7CFF",
  nav_icons:{ home:"rocket", jahr:"telescope", daten:"gem" },
  name:"Weltraum-Taschengeld",
};

// ── Zirkus-Taschenrechner — cremeweiß mit Rummelplatz-Farben (Rot/Gelb/
//    Türkis), dezent gestreifter Hero-Hintergrund ───────────────────────
THEMES.zirkustaschenrechner = {
  ...THEMES.light,
  bg:"#FFF6E6", surf:"#FFFFFF", surf2:"#FFEFD2", surf3:"#FFE6BE",
  bd:"rgba(90,55,20,0.16)", bds:"rgba(90,55,20,0.30)",
  txt:"#3A2418", txt2:"rgba(80,55,35,0.62)", lbl:"rgba(80,55,35,0.46)",
  blue:"#1FA8A0", pos:"#1E8A66", neg:"#E0392B", gold:"#E0A100",
  on_accent:"#FFFFFF", disabled:"#E8D9B8", warn:"#C77700", override:"#9A5A00",
  mid:"#1FA8A0",
  cell_inc:"#1E8A66", cell_inc_bg:"#DFF0D8", cell_inc_bd:"#8FCBA0",
  tab_exp:"#FBDAD4", tab_inc:"#DFF0D8", tab_pend:"#FCEBB8",
  err:"#E0392B", err_bg:"#FCE0DC",
  vorm_bg:"#FCEBB8", vorm_bd:"rgba(224,161,0,0.6)",
  pal_inc_bg:"#E4F3DC", pal_inc_bd:"#8FCBA0", pal_inc_hdr:"#1E8A66", pal_inc_fld:"#D8EED0", pal_inc_val:"#155C40",
  pal_exp_bg:"#FCE2DD", pal_exp_bd:"#EFA098", pal_exp_fld:"#FAD6CE",
  pal_tg_bg:"#DCF2F0", pal_tg_bd:"#7FCFC8", pal_tg_hdr:"#12766F", pal_tg_fld:"#CDECE8", pal_tg_val:"#0C534E",
  hero_bg:"repeating-linear-gradient(120deg, #FFF6E6 0 34px, #FFEAC2 34px 68px)",
  logo_c1:"#1E8A66", logo_c2:"#1FA8A0",
  cond_neg:"#E0392B", cond_warn:"#C77700", cond_gold:"#B8860B", cond_pos:"#1E8A66",
  frame_border:"10px solid #E0392B", frame_ring:"#FFEFD2",
  nav_icons:{ home:"tent", jahr:"ticket", daten:"gift" },
  name:"Zirkus-Taschenrechner",
};

// ════════════════════════════════════════════════════════════════════════
//  Magazin (Editorial) — erstes Theme mit EIGENEM Hero-Layout statt nur
//  eigener Farben: hero_layout:"editorial" schaltet in SaldoHeroV2 auf eine
//  linksbündige Schlagzeilen-Anordnung um (Kicker-Zeile mit Kontowahl oben,
//  großer Betrag links, Prognosen als Ticker-Leiste darunter). Farbwelt:
//  dunkle Tinte + Kupfer/Messing, wie ein edles Finanzmagazin.
// ════════════════════════════════════════════════════════════════════════
THEMES.magazin = {
  ...THEMES.dark,
  bg:"#12141A", surf:"#1A1D24", surf2:"#232730", surf3:"#0D0F13",
  bd:"rgba(235,220,195,0.13)", bds:"rgba(235,220,195,0.26)",
  txt:"#F4EFE5", txt2:"rgba(226,212,188,0.60)", lbl:"rgba(226,212,188,0.46)",
  blue:"#E0975C",   // Kupfer-Akzent (Akzentfarbe der App)
  pos:"#A3C585", neg:"#FF4D06", gold:"#D9B45B",
  on_accent:"#241304", disabled:"#2A2D34",
  warn:"#D9964A", override:"#A96A2A",
  mid:"#8FB6C9",
  cell_inc:"#7F9A68", cell_inc_bg:"#141B10", cell_inc_bd:"#3E5A2C", cell_exp:"#FFE580", over:"#FF7EB6",
  tab_exp:"rgba(226,96,76,0.18)", tab_inc:"rgba(163,197,133,0.16)", tab_pend:"rgba(217,180,91,0.16)",
  err:"#E2604C", err_bg:"#3A140E",
  vorm_bg:"#2A2110", vorm_bd:"rgba(217,180,91,0.8)",
  pal_inc_bg:"#141B10", pal_inc_bd:"#3E5A2C", pal_inc_hdr:"#A3C585", pal_inc_fld:"#182114", pal_inc_val:"#C2DCA8",
  pal_exp_bg:"#241009", pal_exp_bd:"#5C2418", pal_exp_fld:"#2C140C",
  pal_tg_bg:"#101820", pal_tg_bd:"#2A4250", pal_tg_hdr:"#8FB6C9", pal_tg_fld:"#141E28", pal_tg_val:"#B8D5E2",
  hero_bg:"linear-gradient(150deg,#1A1D24 0%,#12141A 55%,#181314 100%)",
  logo_c1:"#E0975C", logo_c2:"#D9B45B",
  cond_neg:"#FF4D06", cond_warn:"#D9964A", cond_gold:"#D9B45B", cond_pos:"#A3C585",
  hero_layout:"editorial",
  nav_icons:{ home:"newspaper", jahr:"trending-up", daten:"archive" },
  name:"Magazin (Editorial)",
};

// Globales T — wird von getAppTheme() überschrieben, initialisiert mit dark — wird von getAppTheme() überschrieben, initialisiert mit dark
function getTheme(name) {
  const t = THEMES[name] || THEMES.dark;
  if (!t.lbl)         t.lbl         = t.txt2;
  if (!t.cf)          t.cf          = "#F6821F";
  if (!t.mid)         t.mid         = "#67E8F9";
  if (!t.on_accent)   t.on_accent   = "#1A1E00";
  if (!t.disabled)    t.disabled    = "#2a2a2a";
  if (!t.warn)        t.warn        = "#F59E0B";
  if (!t.override)    t.override    = "#B45309";
  if (!t.cell_inc)    t.cell_inc    = "#C8E645";
  if (!t.cell_inc_bg) t.cell_inc_bg = "#0F1A00";
  if (!t.cell_inc_bd) t.cell_inc_bd = "#4A6600";
  // cell_exp: Bold-Farbe für Ausgabe-Vormerkungen (Pendant zu cell_inc für
  // Einnahme-Vormerkungen) — nur die 16 dunklen Themes definieren sie fest
  // (#FFE580 Amber-Gelb); alle anderen fallen auf "gold" zurück (bisheriges
  // Verhalten vor der Einführung dieses eigenen Tokens).
  if (!t.cell_exp)    t.cell_exp    = t.gold;
  // over: Ersatzfarbe für massive Budgetüberschreitung (Ampel-Top-Stufen) —
  // ersetzt in den 16 dunklen Themes das kräftige Rot (dort schlecht lesbar/
  // störend, Nutzer-Feedback) durch ein helles Rosa. Alle anderen Themes
  // (hell) behalten ihr bisheriges Rot (err) — dort kein Problem.
  if (!t.over)        t.over        = t.err;
  if (!t.tab_exp)     t.tab_exp     = "#6B1A10";
  if (!t.tab_inc)     t.tab_inc     = "#2A4A00";
  if (!t.tab_pend)    t.tab_pend    = "#5A3A00";
  if (!t.surf3)       t.surf3       = "#2A2E35";
  if (!t.err)         t.err         = "#FF4444";
  if (!t.vorm_bg)     t.vorm_bg     = "#5A3E00";
  if (!t.vorm_bd)     t.vorm_bd     = "#F5A623";
  // fallback for saved themes without newer tokens
  if (!t.hero_bg)   t.hero_bg   = t.bg || "#1A1D22";
  if (!t.cond_neg)  t.cond_neg  = "#C0392B";
  if (!t.cond_warn) t.cond_warn = "#E67E22";
  if (!t.cond_gold) t.cond_gold = "#F1C40F";
  if (!t.cond_pos)  t.cond_pos  = "#2ECC71";
  if (!t.logo_c1)  t.logo_c1  = t.blue || "#6B9900";
  if (!t.logo_c2)  t.logo_c2  = t.pos  || "#AACC00";
  if (!t.err_bg)   t.err_bg   = "#7A1020";
  return t;
}
// INP: live getter damit Theme-Wechsel wirkt

export { THEMES, getTheme };
