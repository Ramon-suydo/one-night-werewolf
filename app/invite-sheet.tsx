'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {Modal} from './dialog';

export default function InviteSheet({code,close}:{code:string;close:()=>void}){
 const[qr,setQr]=useState(''),[message,setMessage]=useState(''),input=useRef<HTMLInputElement>(null);
 const url=typeof location==='undefined'?'':location.origin+'/?room='+code;
 useEffect(()=>{const abort=new AbortController();void fetch('/api/invite?code='+code,{headers:{'x-player-token':localStorage.getItem('werewolf-token')||''},signal:abort.signal}).then(async r=>{if(!r.ok)throw new Error('The QR code is unavailable. Use the link or room code.');const svg=await r.text();setQr('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg))}).catch(e=>{if(!abort.signal.aborted)setMessage(e.message)});return()=>abort.abort()},[code]);
 const copy=async()=>{try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(url);setMessage('Invite link copied.')}catch{input.current?.focus();input.current?.select();setMessage('Select and copy the link above, or share the room code.')}};
 const share=async()=>{try{await navigator.share({title:'Join my Werewolf table',text:'Your seat is waiting. Room '+code,url})}catch(e){if((e as Error).name!=='AbortError')void copy()}};
 return <Modal label="Invite friends" onClose={close} className="invite-sheet"><small>GATHER YOUR TABLE</small><h2>Room {code}</h2><p>Everyone joins on their own phone or computer.</p>{qr&&<Image unoptimized width={200} height={200} src={qr} alt={'Scan to join room '+code}/>}<label>Invite link<input ref={input} readOnly aria-label="Invite link" value={url} onFocus={e=>e.target.select()}/></label><div className="row"><button className="btn" onClick={()=>void copy()}>Copy link</button>{typeof navigator!=='undefined'&&typeof navigator.share==='function'&&<button className="btn alt" onClick={()=>void share()}>Share invite</button>}</div><p className="invite-status" role="status">{message||'Send this link, scan the code, or enter '+code+'.'}</p><button className="btn alt" onClick={close}>Back to the fire</button></Modal>;
}
