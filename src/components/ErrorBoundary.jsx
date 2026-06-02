// Auto-generated module (siehe app-src.jsx)

import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = {error: null, info: null}; }
  componentDidCatch(error, info) {
    console.error("BOUNDARY CAUGHT:", error.message, info.componentStack);
    this.setState({info});
  }
  static getDerivedStateFromError(error) { return {error}; }
  render() {
    if (this.state.error) return (
      <div style={{color:"#ff6b6b",padding:16,background:"#1a0000",borderRadius:8,margin:8,
        fontSize:11,fontFamily:"monospace",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
        <b style={{fontSize:13}}>⚠ Fehler in: {this.props.name}</b>
        <div style={{marginTop:8,color:"#ffaaaa"}}>{this.state.error.message}</div>
        {this.state.error.stack&&(
          <details style={{marginTop:8}}>
            <summary style={{cursor:"pointer",color:"#aaaaff"}}>Stack-Trace anzeigen</summary>
            <pre style={{marginTop:6,fontSize:9,color:"#888",overflow:"auto"}}>{this.state.error.stack}</pre>
          </details>
        )}
        <button onClick={()=>this.setState({error:null,info:null})}
          style={{marginTop:10,padding:"6px 12px",background:"#333",color:"#fff",
            border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
          Zurücksetzen
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

export { ErrorBoundary };
