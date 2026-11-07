'use client'
import {createContext,useCallback,useContext,useState,useSyncExternalStore,type ReactNode} from 'react'
import {DEFAULT_PRODUCER_ROOM_LAYOUT,parseProducerRoomLayout,producerLayoutStorageKey,type ProducerRoomLayout} from '@/lib/producer/roomLayouts'
const EVENT='jupiter:producer-layout'
const sessionValues=new Map<string,ProducerRoomLayout>()
type Preference={layout:ProducerRoomLayout;chooseLayout:(layout:ProducerRoomLayout)=>void;saveMessage:string;rightRailOpen:boolean;toggleRightRail:()=>void;dockTab:'sources'|'scenes';setDockTab:(tab:'sources'|'scenes')=>void}
const Context=createContext<Preference>({layout:DEFAULT_PRODUCER_ROOM_LAYOUT,chooseLayout:()=>{},saveMessage:'',rightRailOpen:false,toggleRightRail:()=>{},dockTab:'sources',setDockTab:()=>{}})
export function useProducerLayout(){return useContext(Context)}
export function ProducerLayoutProvider({ownerId,children}:{ownerId?:string;children:ReactNode}){
 const key=producerLayoutStorageKey(ownerId)
 const [visitLayout,setVisitLayout]=useState<ProducerRoomLayout>(DEFAULT_PRODUCER_ROOM_LAYOUT),[saveMessage,setSaveMessage]=useState(''),[rightRailOpen,setRightRailOpen]=useState(false),[dockTab,setDockTab]=useState<'sources'|'scenes'>('sources')
 const subscribe=useCallback((notify:()=>void)=>{
  function changed(event:Event){if(event instanceof StorageEvent){if(event.key!==key&&event.key!==null)return;if(key)sessionValues.delete(key)}notify()}
  window.addEventListener('storage',changed);window.addEventListener(EVENT,changed)
  return()=>{window.removeEventListener('storage',changed);window.removeEventListener(EVENT,changed)}
 },[key])
 const snapshot=useCallback(()=>{if(!key)return visitLayout;try{return sessionValues.get(key)??parseProducerRoomLayout(window.localStorage.getItem(key))}catch{return sessionValues.get(key)??DEFAULT_PRODUCER_ROOM_LAYOUT}},[key,visitLayout])
 const layout=useSyncExternalStore(subscribe,snapshot,()=>DEFAULT_PRODUCER_ROOM_LAYOUT)
 function chooseLayout(next:ProducerRoomLayout){
  const safe=parseProducerRoomLayout(next)
  if(!key){setVisitLayout(safe);setSaveMessage('Layout applied for this visit');return}
  sessionValues.set(key,safe)
  try{window.localStorage.setItem(key,safe);setSaveMessage('Layout saved')}catch{setSaveMessage('Layout applied for this visit; browser storage unavailable')}
  window.dispatchEvent(new Event(EVENT))
 }
 return <Context.Provider value={{layout,chooseLayout,saveMessage,rightRailOpen,toggleRightRail:()=>setRightRailOpen(value=>!value),dockTab,setDockTab}}>{children}</Context.Provider>
}
