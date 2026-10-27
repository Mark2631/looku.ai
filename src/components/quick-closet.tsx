"use client";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Layers3, Sparkles, Shirt, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Starter = { id:string; name:string; category:string; colors:string[]; formality:number; tags:string[] };
const STARTERS: Starter[] = [
{ id:"tee-white",name:"White everyday T-shirt",category:"Tops",colors:["white"],formality:3,tags:["basic","casual"] },
{ id:"tee-black",name:"Black T-shirt",category:"Tops",colors:["black"],formality:3,tags:["basic","casual"] },
{ id:"shirt-white",name:"White button-up shirt",category:"Tops",colors:["white"],formality:7,tags:["smart","classic"] },
{ id:"shirt-blue",name:"Blue button-up shirt",category:"Tops",colors:["blue"],formality:6,tags:["smart casual"] },
{ id:"blouse",name:"Neutral blouse",category:"Tops",colors:["beige"],formality:6,tags:["soft","smart"] },
{ id:"polo",name:"Polo shirt",category:"Tops",colors:["navy"],formality:5,tags:["smart casual"] },
{ id:"jeans-blue",name:"Blue jeans",category:"Bottoms",colors:["blue"],formality:4,tags:["everyday","denim"] },
{ id:"jeans-black",name:"Black jeans",category:"Bottoms",colors:["black"],formality:5,tags:["everyday","denim"] },
{ id:"trousers-black",name:"Black tailored trousers",category:"Bottoms",colors:["black"],formality:8,tags:["classic","work"] },
{ id:"chinos",name:"Neutral chinos",category:"Bottoms",colors:["khaki"],formality:6,tags:["smart casual"] },
{ id:"shorts",name:"Casual shorts",category:"Bottoms",colors:["beige"],formality:2,tags:["weekend"] },
{ id:"skirt",name:"Everyday skirt",category:"Bottoms",colors:["black"],formality:6,tags:["everyday"] },
{ id:"dress-black",name:"Black dress",category:"Dresses",colors:["black"],formality:7,tags:["classic","versatile"] },
{ id:"dress-print",name:"Printed day dress",category:"Dresses",colors:["multicolor"],formality:4,tags:["casual","expressive"] },
{ id:"dress-formal",name:"Special occasion dress",category:"Dresses",colors:["navy"],formality:9,tags:["celebration"] },
{ id:"sneakers-white",name:"White sneakers",category:"Shoes",colors:["white"],formality:3,tags:["everyday"] },
{ id:"sneakers-black",name:"Black sneakers",category:"Shoes",colors:["black"],formality:3,tags:["everyday"] },
{ id:"dress-shoes",name:"Black formal shoes",category:"Shoes",colors:["black"],formality:9,tags:["formal"] },
{ id:"sandals",name:"Casual sandals",category:"Shoes",colors:["brown"],formality:2,tags:["relaxed"] },
{ id:"flats",name:"Neutral flats",category:"Shoes",colors:["beige"],formality:6,tags:["comfortable"] },
{ id:"boots",name:"Everyday boots",category:"Shoes",colors:["brown"],formality:5,tags:["casual"] },
{ id:"jacket-denim",name:"Denim jacket",category:"Outerwear",colors:["blue"],formality:4,tags:["layering"] },
{ id:"blazer",name:"Smart blazer",category:"Outerwear",colors:["black"],formality:8,tags:["work"] },
{ id:"hoodie",name:"Comfort hoodie",category:"Outerwear",colors:["gray"],formality:2,tags:["casual"] },
{ id:"cardigan",name:"Light cardigan",category:"Outerwear",colors:["cream"],formality:5,tags:["layering"] },
{ id:"bag",name:"Everyday handbag or tote",category:"Bags",colors:["brown"],formality:5,tags:["everyday"] },
{ id:"backpack",name:"Backpack",category:"Bags",colors:["black"],formality:3,tags:["campus"] },
{ id:"belt",name:"Simple leather belt",category:"Accessories",colors:["black"],formality:6,tags:["basic"] },
{ id:"swim",name:"My swimsuit or swim shorts",category:"Swimwear",colors:[],formality:2,tags:["swimwear"] },
{ id:"active",name:"Workout set",category:"Activewear",colors:[],formality:2,tags:["activewear"] }
];
const FILTERS=["All","Tops","Bottoms","Dresses","Shoes","Outerwear","Bags","Accessories","Activewear","Swimwear"];
export function QuickCloset({ userId, existing, onImported, onPhotoUpload }:{userId:string;existing:{name:string;category:string}[];onImported:()=>Promise<void>;onPhotoUpload:()=>void}) {
 const [selected,setSelected]=useState<string[]>([]);
 const [filter,setFilter]=useState("All");
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const existingPairs=useMemo(()=>new Set(existing.map(x=>(x.name+"|"+x.category).toLowerCase())),[existing]);
 const visible=STARTERS.filter(item=>(filter==="All"||item.category===filter)&&!existingPairs.has((item.name+"|"+item.category).toLowerCase()));
 async function add(){
  if(!selected.length||saving)return;setSaving(true);setMessage("");
  const chosen=STARTERS.filter(x=>selected.includes(x.id));
  try{
   const {error}=await createClient().from("wardrobe_items").insert(chosen.map(item=>({
    user_id:userId,name:item.name,category:item.category,colors:item.colors,formality:item.formality,
    seasons:[],style_tags:item.tags,attributes:{source:"quick_closet",user_confirmed_ownership:true,photo_pending:true},
    is_owned:true,status:"available",image_path:null
   })));
   if(error)throw error;
   setSelected([]);setMessage("Added "+chosen.length+" confirmed pieces. Add photos whenever you like.");
   await onImported();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not add your selected clothes.");}
  finally{setSaving(false);}
 }
 return <section className="surface section" style={{padding:20}}>
  <div className="row" style={{alignItems:"start"}}><div><span className="eyebrow">QUICK START · NO PHOTOS REQUIRED</span><h2 className="section-title">Tap what you already own.</h2><p className="section-note">Start with a few real pieces. These are editable labels—not inventory LOOKU assumes you own. Select only items you actually have. Add your own photos later.</p></div><Shirt size={22}/></div>
  <div className="filter-row" style={{marginTop:14}}>{FILTERS.map(cat=><button className={"filter-pill "+(filter===cat?"active":"")} key={cat} onClick={()=>setFilter(cat)}>{cat}</button>)}</div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))",gap:9,marginTop:15}}>
   {visible.map(item=>{const chosen=selected.includes(item.id);return <button key={item.id} onClick={()=>setSelected(prev=>chosen?prev.filter(x=>x!==item.id):[...prev,item.id])} aria-pressed={chosen} style={{textAlign:"left",minHeight:96,border:"1px solid "+(chosen?"#526349":"#e8e4dc"),borderRadius:12,background:chosen?"#e8eddf":"#fff",color:"#20211f",padding:12,display:"flex",flexDirection:"column",justifyContent:"space-between",cursor:"pointer"}}><span style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start",fontSize:12,fontWeight:600,lineHeight:1.4}}>{item.name}<span style={{flexShrink:0,color:"#526349"}}>{chosen?<Check size={17}/>:<span style={{fontSize:18}}>+</span>}</span></span><span className="tiny muted">{item.category}{item.colors.length?" · "+item.colors.join(", "):""}</span></button>})}
  </div>
  <div className="row" style={{marginTop:17,flexWrap:"wrap"}}><span className="small muted">{selected.length} selected</span><div className="tool-row"><button className="button compact" onClick={onPhotoUpload}><Layers3 size={13}/>Use my photos</button><button className="button primary" disabled={!selected.length||saving} onClick={()=>void add()}><Check size={14}/>{saving?"Saving…":"Add selected to my closet"}<ChevronRight size={14}/></button></div></div>
  {message&&<p className="small muted" role="status" style={{marginTop:8}}>{message}</p>}
  <p className="tiny muted" style={{marginTop:8}}>These quick labels use typical colours as starting values. Edit them to match your actual garments before relying on colour-specific styling.</p>
 </section>;
}
