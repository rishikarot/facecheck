import {FaceCheckWidget} from './src/index.js';
const widget=new FaceCheckWidget({container:'#facecheck',baseUrl:'./assets/'});
window.faceCheckDemo=widget;

if ('serviceWorker' in navigator && location.protocol==='https:') {navigator.serviceWorker.register('./sw.js').catch(()=>{});}
