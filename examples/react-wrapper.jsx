// Example React adapter — use in a React/Vite project that copies SDK sources/assets.
import {useEffect, useRef} from 'react';
import {FaceCheckWidget} from '../src/index.js';
import '../styles/facecheck.css';
export function FaceCheck({referenceFile,mode='live',onResult,policy}) {
  const holder=useRef(null);
  useEffect(()=>{
    const widget=new FaceCheckWidget({container:holder.current,baseUrl:'/facecheck-assets/',policy,onResult,showReferencePicker:!referenceFile});
    if(referenceFile)widget.setReference(referenceFile).catch(console.error);
    widget.setMode(mode);
    return ()=>widget.destroy();
  },[]);
  // Change reference or mode by calling the widget methods, not by reconstructing it while a camera session runs.
  return <div ref={holder}/>;
}
