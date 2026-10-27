"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Package, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Purchase = { id:string; retailer:string; item_title:string; product_url:string|null; tracking_url:string|null; order_reference:string|null; status:"saved"|"ordered"|"shipped"|"delivered"|"cancelled"; created_at:string };
const STATES = ["saved","ordered","shipped","delivered","cancelled"] as const;
function httpsUrl(s:string){if(!s.trim())return null;try{const url=new URL(s.trim());return url.protocol==="https:"?url.toString():null;}catch{return null;}}

export function ShoppingJournal({userId}:{userId:string}){
  const [orders,setOrders]=useState<Purchase[]>([]);
  const [merchant,setMerchant]=useState("");
  const [title,setTitle]=useState("");
  const [productLink,setProductLink]=useState("");
  const [trackingLink,setTrackingLink]=useState("");
  const [reference,setReference]=useState("");
  const [status,setStatus]=useState<Purchase["status"]>("ordered");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const refresh=useCallback(async()=>{
    const {data,error}=await createClient().from("shopping_orders").select("id,retailer,item_title,product_url,tracking_url,order_reference,status,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);
    if(error)setMessage("Couldn't load your shopping journal.");
    else setOrders((data||[]) as Purchase[]);
  },[userId]);
  useEffect(()=>{void refresh();},[refresh]);
  async function add(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(busy)return;
    if((productLink.trim()&&!httpsUrl(productLink))||(trackingLink.trim()&&!httpsUrl(trackingLink))){setMessage("Use HTTPS links for product and tracking pages.");return;}
    setBusy(true);setMessage("");
    const {error}=await createClient().from("shopping_orders").insert({
      user_id:userId,retailer:merchant.trim().slice(0,120),item_title:title.trim().slice(0,180),
      product_url:httpsUrl(productLink),tracking_url:httpsUrl(trackingLink),
      order_reference:reference.trim().slice(0,120)||null,status
    });
    if(error)setMessage("Could not save the purchase. Please retry.");
    else{setMerchant("");setTitle("");setProductLink("");setTrackingLink("");setReference("");setMessage("Added to your private shopping journal.");await refresh();}
    setBusy(false);
  }
  async function update(order:Purchase,next:Purchase["status"]){
    const {error}=await createClient().from("shopping_orders").update({status:next,updated_at:new Date().toISOString()}).eq("id",order.id).eq("user_id",userId);
    if(error)setMessage("Couldn't update the status.");
    else await refresh();
  }
  async function remove(order:Purchase){
    if(!window.confirm("Remove this entry from your shopping journal?"))return;
    const {error}=await createClient().from("shopping_orders").delete().eq("id",order.id).eq("user_id",userId);
    if(error)setMessage("Couldn't remove that entry.");
    else await refresh();
  }
  return <section className="section shopping-journal">
    <div className="section-head"><div><span className="eyebrow">YOUR SHOPPING JOURNAL</span><h2 className="section-title">Keep tabs on what you buy.</h2><p className="section-note">Save a purchase from any retailer, including Amazon. Add the retailer's tracking URL when available.</p></div><Package size={23}/></div>
    <div className="privacy-banner"><ShieldCheck size={17}/><span>This is a private manual tracker, not a connected checkout. LOOKU cannot charge you, confirm merchant orders, or automatically read Amazon shipping updates. Always verify on the official retailer's website.</span></div>
    <form className="surface section" onSubmit={add}>
      <div className="twocol"><label className="field">Retailer<input className="input" required maxLength={120} value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder="e.g. Amazon, local boutique"/></label><label className="field">Item<input className="input" required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Brown leather loafers"/></label></div>
      <div className="twocol"><label className="field">Product link (optional)<input className="input" type="url" value={productLink} onChange={e=>setProductLink(e.target.value)} placeholder="https://…"/></label><label className="field">Tracking page (optional)<input className="input" type="url" value={trackingLink} onChange={e=>setTrackingLink(e.target.value)} placeholder="https://…"/></label></div>
      <div className="twocol"><label className="field">Retailer order reference (optional)<input className="input" maxLength={120} value={reference} onChange={e=>setReference(e.target.value)}/></label><label className="field">Status<select className="input" value={status} onChange={e=>setStatus(e.target.value as Purchase["status"])}>{STATES.map(v=><option key={v} value={v}>{v}</option>)}</select></label></div>
      <button type="submit" className="button primary" disabled={busy}><Plus size={15}/>{busy?"Saving…":"Save purchase"}</button>
    </form>
    {message&&<p role="status" className="small muted">{message}</p>}
    {orders.length>0&&<div className="stack section">{orders.map(order=><article className="surface" key={order.id}><div className="row" style={{alignItems:"start",gap:12}}><div style={{flex:1,minWidth:0}}><span className="eyebrow">{order.retailer}</span><h3 style={{margin:"6px 0",fontSize:15}}>{order.item_title}</h3><p className="small muted">{order.order_reference?"Ref: "+order.order_reference+" · ":""}{new Date(order.created_at).toLocaleDateString()}</p></div><button className="button compact" aria-label={"Delete "+order.item_title} onClick={()=>void remove(order)}><Trash2 size={14}/></button></div><div className="tool-row"><select className="input" style={{maxWidth:160}} aria-label={"Status of "+order.item_title} value={order.status} onChange={e=>void update(order,e.target.value as Purchase["status"])}>{STATES.map(v=><option key={v} value={v}>{v}</option>)}</select>{order.tracking_url&&<a className="button compact" target="_blank" rel="noopener noreferrer" href={order.tracking_url}>Retailer tracking <ArrowUpRight size={14}/></a>}{order.product_url&&<a className="button compact" target="_blank" rel="noopener noreferrer" href={order.product_url}>Product <ArrowUpRight size={14}/></a>}</div></article>)}</div>}
    {!orders.length&&<p className="small muted" style={{marginTop:15}}><Check size={13} style={{display:"inline"}}/> No recorded purchases yet. Add an order when you shop.</p>}
  </section>;
}
