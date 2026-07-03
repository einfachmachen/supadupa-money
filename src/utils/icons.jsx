// Lucide-Icons-Helper (Li) und Icon-Sets
// Die fest verdrahteten UI-Icons kommen statisch aus lucideStatic.js (sofort
// renderbar); das Gesamtpaket (~700kB, größter Einzel-Chunk der App) lädt
// NICHT mehr automatisch beim Start, sondern erst per ensureLucideLoaded() —
// gebraucht für Icon-Picker & Nutzer-Icons außerhalb des kuratierten Sets.
// main.jsx ruft es opportunistisch im Leerlauf (requestIdleCallback) auf,
// damit es meist schon bereitsteht; Icon-Picker rufen es zusätzlich selbst
// beim Öffnen auf (idempotent), falls der Leerlauf-Trigger noch nicht lief.
import { STATIC_LUCIDE } from "./lucideStatic.js";

let _lucideLoadPromise = null;
function ensureLucideLoaded() {
  if(typeof window === "undefined") return Promise.resolve();
  if(window.LucideIcons) return Promise.resolve(window.LucideIcons);
  if(_lucideLoadPromise) return _lucideLoadPromise;
  _lucideLoadPromise = import("lucide-react").then(m => {
    window.LucideIcons = m;
    window.dispatchEvent(new Event("lucide-ready"));
    return m;
  });
  return _lucideLoadPromise;
}

const _toPascal = s => s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
let _ALL_LUCIDE_ICONS = null;
// ALL_LUCIDE_ICONS als normale Funktion - kein Proxy
const _getAllLucideIcons = () => {
  // Solange der Lucide-Chunk noch lädt, keine leere Liste cachen
  if(!_ALL_LUCIDE_ICONS || _ALL_LUCIDE_ICONS.length === 0) {
    const li = window.LucideIcons || {};
    _ALL_LUCIDE_ICONS = Object.keys(li)
      .filter(k =>
        /^[A-Z]/.test(k) &&
        k !== "createLucideIcon" &&
        k !== "default" &&
        !k.endsWith("Icon") &&
        (typeof li[k] === "function" || typeof li[k]?.render === "function")
      )
      .map(k => k.replace(/([A-Z])/g, m => "-" + m.toLowerCase()).slice(1))
      .sort();
  }
  return _ALL_LUCIDE_ICONS;
};
// ALL_LUCIDE_ICONS als getter-Property auf einem normalen Array-ähnlichen Objekt
// Aber einfacher: direkt als getter
// Benannter Export für Komponenten, die die Liste direkt brauchen
// (PagedIconGrid nutzte _getAllLucideIcons bisher ohne Import — ReferenceError)
const getAllLucideIcons = _getAllLucideIcons;
const ALL_LUCIDE_ICONS = {
  get length() { return _getAllLucideIcons().length; },
  [Symbol.iterator]() { return _getAllLucideIcons()[Symbol.iterator](); },
  filter(...args) { return _getAllLucideIcons().filter(...args); },
  slice(...args) { return _getAllLucideIcons().slice(...args); },
  includes(...args) { return _getAllLucideIcons().includes(...args); },
};
const _siSvgCache = {};
const Li = (name, size=16, color="currentColor") => {
  if(!name) return null;
  if(name.startsWith("up:")) {
    // Eigene hochgeladene Icons — aus globalem Cache oder kvStore
    try {
      const _kv = window.kvStore;
      const icons = window._customIcons || JSON.parse((_kv ? _kv.getItem("mbt_custom_icons") : null)||"[]");
      const ic = icons.find(i=>i.slug===name);
      if(ic) return <img src={ic.data} style={{width:size,height:size,objectFit:"contain",display:"inline-block",verticalAlign:"middle",flexShrink:0}}/>;
    } catch(e){}
    return null;
  }
  if(name.startsWith("bk:")) {
    const slug = name.slice(3);
    const svg = BANK_SVGS[slug];
    if(!svg) return null;
    return <span style={{width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,verticalAlign:"middle",color}}
      dangerouslySetInnerHTML={{__html:svg.replace(/width="[^"]*"/g,`width="${size}"`).replace(/height="[^"]*"/g,`height="${size}"`)}} />;
  }
  if(name.startsWith("si:")) {
    const slug = name.slice(3);
    if(_siSvgCache[slug]) {
      return <span style={{width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,verticalAlign:"middle",color}}
        dangerouslySetInnerHTML={{__html:_siSvgCache[slug]
          .replace(/width="[^"]*"/,`width="${size}"`)
          .replace(/height="[^"]*"/,`height="${size}"`)}} />;
    }
    fetch(`https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/${slug}.svg`)
      .then(r=>r.text()).then(text=>{
        _siSvgCache[slug]=text.replace(/fill="[^"]*"/g,'').replace('<svg','<svg fill="currentColor"');
      }).catch(()=>{});
    return <span style={{width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,verticalAlign:"middle",opacity:0.5}}>{Li("credit-card",size,color)}</span>;
  }
  try {
    // Statische UI-Icons zuerst (immer sofort verfügbar), dann das
    // asynchron nachgeladene Gesamtset
    const Comp = STATIC_LUCIDE[name] || (window.LucideIcons || {})[_toPascal(name)];
    if (!Comp) return null;
    return <Comp size={size} color={color} strokeWidth={2} style={{display:"inline-block",verticalAlign:"middle",flexShrink:0}} />;
  } catch(e) { return null; }
};
// ─── Shared UI components (defined outside app to avoid recreation) ───────────

// Bank/Simple/Icon-Sets
const BANK_SVGS = {
  "dkb": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="22" fill="currentColor" letter-spacing="2">DKB</text></svg>`,
  "ing": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="22" fill="currentColor" letter-spacing="3">ING</text></svg>`,
  "norisbank": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="13" fill="currentColor">norisbank</text></svg>`,
  "sparkasse": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="18" y="30" font-family="Arial,sans-serif" font-weight="900" font-size="28" fill="currentColor">S</text><text x="36" y="26" font-family="Arial,sans-serif" font-weight="600" font-size="11" fill="currentColor">Sparkasse</text></svg>`,
  "volksbank": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="14" y="29" font-family="Arial,sans-serif" font-weight="900" font-size="22" fill="currentColor">VR</text><text x="48" y="22" font-family="Arial,sans-serif" font-weight="600" font-size="9" fill="currentColor">Volks-</text><text x="48" y="32" font-family="Arial,sans-serif" font-weight="600" font-size="9" fill="currentColor">bank</text></svg>`,
  "sparda": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="14" fill="currentColor">Sparda</text></svg>`,
  "postbank": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="14" y="29" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="currentColor">P</text><text x="32" y="27" font-family="Arial,sans-serif" font-weight="600" font-size="12" fill="currentColor">Postbank</text></svg>`,
  "comdirect": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="currentColor">comdirect</text></svg>`,
  "consorsbank": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="currentColor">Consorsbank</text></svg>`,
  "hvb": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="22" fill="currentColor" letter-spacing="2">HVB</text></svg>`,
  "targobank": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="currentColor">TARGOBANK</text></svg>`,
  "santander": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="currentColor">Santander</text></svg>`,
  "barclays": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="13" fill="currentColor">Barclays</text></svg>`,
  "n26": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="50" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="currentColor" letter-spacing="1">N26</text></svg>`,
  "raiffeisen": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><rect x="0" y="0" width="100" height="40" rx="4" fill="currentColor" opacity="0.12"/><text x="14" y="29" font-family="Arial,sans-serif" font-weight="900" font-size="26" fill="currentColor">R</text><text x="36" y="22" font-family="Arial,sans-serif" font-weight="600" font-size="9" fill="currentColor">Raiffeisen-</text><text x="36" y="32" font-family="Arial,sans-serif" font-weight="600" font-size="9" fill="currentColor">bank</text></svg>`,
};
const ICON_CATEGORIES = [
  { label: "alle",          keywords: null },
  { label: "Finanzen",      keywords: ["bank","wallet","credit","coin","cash","money","euro","dollar","piggy","receipt","invoice","landmark","trending","chart","bar-chart","line-chart","pie-chart","percent","calculator","vault","safe","handshake","badge-dollar","badge-euro","badge-cent","badge-percent","currency","bitcoin","gem"] },
  { label: "Einkaufen",     keywords: ["shopping","cart","bag","store","tag","gift","package","barcode","scan","ticket","percent","star","award","ribbon","coupon","label"] },
  { label: "Essen & Trinken",keywords: ["utensils","coffee","cup","beer","wine","pizza","cake","apple","carrot","fish","ice-cream","cookie","croissant","sandwich","salad","chef","restaurant","fork","knife","spoon","milk","bottle","cocktail","candy","lollipop","popcorn","grill"] },
  { label: "Transport",     keywords: ["car","bus","train","plane","bike","truck","ship","anchor","rocket","fuel","map-pin","navigation","compass","road","traffic","taxi","tram","subway","bicycle","scooter","motorcycle","boat","sail"] },
  { label: "Zuhause",       keywords: ["home","house","building","door","key","lock","sofa","bed","bath","toilet","lamp","light","plug","tv","monitor","thermometer","fan","ac","archive","mailbox","fence","garage","warehouse","hotel","tent"] },
  { label: "Gesundheit",    keywords: ["heart","activity","pulse","pill","syringe","stethoscope","hospital","ambulance","cross","bandage","thermometer","microscope","dna","lungs","eye","ear","hand","brain","apple","weight","dumbbell","fitness","run","walk","yoga"] },
  { label: "Freizeit",      keywords: ["music","headphones","camera","image","video","film","tv","book","gamepad","joystick","dice","trophy","medal","star","sun","moon","cloud","mountain","tree","flower","beach","umbrella","tent","compass","map","fishing","football","soccer","basketball","tennis","golf","ski","swim","surf","chess","palette","brush","pen","pencil"] },
  { label: "Personen",      keywords: ["user","users","person","people","baby","child","man","woman","group","team","contact","profile","account","face","smile","laugh","frown","heart","handshake","hug"] },
  { label: "Kommunikation", keywords: ["mail","email","message","chat","phone","call","bell","notification","send","inbox","at-sign","share","link","wifi","signal","radio","tv","rss","broadcast","megaphone","mic","speaker","volume"] },
  { label: "Technik",       keywords: ["laptop","desktop","monitor","tablet","smartphone","phone","keyboard","mouse","printer","server","database","cloud","cpu","hard-drive","usb","wifi","bluetooth","battery","power","plug","cable","circuit","chip","code","terminal","settings","tool","wrench","gear","cog"] },
  { label: "Sonstiges",     keywords: ["flag","tag","bookmark","paperclip","clip","pin","scissors","ruler","pen","pencil","edit","trash","delete","archive","folder","file","document","note","list","check","x","plus","minus","arrow","sort","filter","search","zoom","info","alert","warning","help","question","lock","unlock","eye","hide","refresh","clock","timer","calendar","date"] },
  { label: "Banken & Zahlung", keywords: null, simpleIcons: true },
  { label: "eigene Icons", keywords: null, bankIcons: true },
];

// Bank Icons Grid
const BANK_ICONS_LIST = [
  { slug:"dkb",         label:"DKB" },
  { slug:"ing",         label:"ING" },
  { slug:"norisbank",   label:"Norisbank" },
  { slug:"sparkasse",   label:"Sparkasse" },
  { slug:"volksbank",   label:"Volksbank/VR" },
  { slug:"sparda",      label:"Sparda-Bank" },
  { slug:"postbank",    label:"Postbank" },
  { slug:"comdirect",   label:"Comdirect" },
  { slug:"consorsbank", label:"Consorsbank" },
  { slug:"hvb",         label:"HypoVereinsbank" },
  { slug:"targobank",   label:"Targobank" },
  { slug:"santander",   label:"Santander" },
  { slug:"barclays",    label:"Barclays" },
  { slug:"n26",         label:"N26" },
  { slug:"raiffeisen",  label:"Raiffeisen" },
];
const SIMPLE_ICONS = [
  // Zahlungsdienste
  { slug:"paypal",          label:"PayPal" },
  { slug:"visa",            label:"Visa" },
  { slug:"mastercard",      label:"Mastercard" },
  { slug:"americanexpress", label:"Amex" },
  { slug:"klarna",          label:"Klarna" },
  { slug:"applepay",        label:"Apple Pay" },
  { slug:"googlepay",       label:"Google Pay" },
  { slug:"amazonpay",       label:"Amazon Pay" },
  { slug:"stripe",          label:"Stripe" },
  { slug:"revolut",         label:"Revolut" },
  { slug:"wise",            label:"Wise" },
  { slug:"payoneer",        label:"Payoneer" },
  // Banken
  { slug:"deutschebank",    label:"Deutsche Bank" },
  { slug:"commerzbank",     label:"Commerzbank" },
  { slug:"sparkasse",       label:"Sparkasse" },
  { slug:"n26",             label:"N26" },
  { slug:"hsbc",            label:"HSBC" },
  // Shopping
  { slug:"amazon",          label:"Amazon" },
  { slug:"ebay",            label:"eBay" },
  { slug:"zalando",         label:"Zalando" },
  { slug:"otto",            label:"Otto" },
  // Crypto
  { slug:"bitcoin",         label:"Bitcoin" },
  { slug:"ethereum",        label:"Ethereum" },
  { slug:"coinbase",        label:"Coinbase" },
];

// Simple Icons renderer — lädt SVGs vom CDN
function matchIconCategory(iconName, keywords) {
  if (!keywords) return true;
  return keywords.some(kw => iconName.includes(kw));
}

export {
  Li,
  ALL_LUCIDE_ICONS,
  getAllLucideIcons,
  BANK_SVGS,
  ICON_CATEGORIES,
  BANK_ICONS_LIST,
  SIMPLE_ICONS,
  matchIconCategory,
  ensureLucideLoaded,
};
