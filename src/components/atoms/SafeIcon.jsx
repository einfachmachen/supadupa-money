// Auto-generated module (siehe app-src.jsx)

import React from "react";
import { theme as T } from "../../theme/activeTheme.js";
import { LucideIcons } from "../../utils/icons.jsx";

class SafeIcon extends React.Component {
  constructor(props) { super(props); this.state = {crashed: false}; }
  componentDidCatch(e) { console.warn("SafeIcon crashed:", this.props.name, e); this.setState({crashed: true}); }
  static getDerivedStateFromError() { return {crashed: true}; }
  render() {
    if (this.state.crashed) return <span style={{fontSize:7,color:T.txt2,width:"100%",textAlign:"center",display:"block",overflow:"hidden"}}>{(this.props.name||"").slice(0,5)}</span>;
    const icons = window.LucideIcons || {};
    const pascal = (this.props.name||"").replace(/(^|-)([a-z0-9])/g, (_,__,c)=>c.toUpperCase());
    const Comp = icons[pascal];
    if(!Comp) return <span style={{fontSize:7,color:T.txt2,width:"100%",textAlign:"center",display:"block",overflow:"hidden"}}>{(this.props.name||"").slice(0,5)}</span>;
    try {
      return <Comp size={this.props.size||14} color={this.props.color||T.txt2} strokeWidth={2} style={{display:"block",flexShrink:0}}/>;
    } catch(e) {
      this.setState({crashed:true});
      return null;
    }
  }
}

export { SafeIcon };
