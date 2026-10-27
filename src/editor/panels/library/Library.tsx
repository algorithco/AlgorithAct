import { Plus, Search, UserRound, Waves, Type, ImagePlus, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import type { Project } from '../../../model/schema/project';
import { CharacterThumb } from './CharacterThumb';
import '../panels.css';

export type LibraryTab='characters'|'motions'|'scene';
interface Props {project:Project;tab:LibraryTab;onAddCharacter:(id:string)=>void;onAddMotion:(id:string)=>void;onAddText:()=>void;onImportImage:()=>void;onBackground:(color:string)=>void;}

export function Library({project,tab,onAddCharacter,onAddMotion,onAddText,onImportImage,onBackground}:Props){
  const [queries,setQueries]=useState<Partial<Record<LibraryTab,string>>>({});
  const search=queries[tab]??'';
  const setSearch=(value:string)=>setQueries(previous=>({...previous,[tab]:value}));
  const heading=tab==='characters'?'Personajlar':tab==='motions'?'Harakatlar':'Sahna';
  const characters=Object.values(project.library.characters).filter(character=>character.name.toLowerCase().includes(search.trim().toLowerCase()));
  const motions=Object.values(project.library.motions).filter(motion=>motion.name.toLowerCase().includes(search.trim().toLowerCase()));
  const empty=tab==='characters'?characters.length===0:tab==='motions'&&motions.length===0;
  const background=project.scenes[project.sceneOrder[0]].background;

  return <aside className="library-panel" aria-label={`${heading} kutubxonasi`}>
    <div className="panel-heading"><h2>{heading}</h2><span className="count-badge">{tab==='characters'?Object.keys(project.library.characters).length:tab==='motions'?Object.keys(project.library.motions).length:'2D'}</span></div>
    <p className="panel-intro">{tab==='characters'?'Hikoyangizning qahramonini tanlang.':tab==='motions'?'Bir harakat bilan hayot bering.':'Hikoyangizga mos sahna yarating.'}</p>
    {tab!=='scene' && <div className="search-field"><Search size={18}/><input aria-label={`${heading} qidirish`} placeholder="Qidirish…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button aria-label="Qidiruvni tozalash" onClick={()=>setSearch('')}><X size={16}/></button>}</div>}
    <div className="library-scroll">
      {empty&&<div className="library-empty" role="status"><Search size={28}/><strong>Natija topilmadi</strong><p>Boshqa nom bilan qidirib ko‘ring.</p><button onClick={()=>setSearch('')}>Barchasini ko‘rsatish</button></div>}
      {tab==='characters'&&!empty && <>
        <div className="section-label">Original to‘plam <span>{characters.length} personaj</span></div>
        <div className="character-grid">{characters.map((character,i)=><button className="character-card" key={character.id} onClick={()=>onAddCharacter(character.id)} aria-label={`${character.name} personajini qo‘shish`}>
          <div className={`character-preview ${i?'green':''}`}><CharacterThumb rig={project.library.rigs[character.rigId]} skin={project.library.skins[character.skinId]}/><span className="card-add"><Plus size={17}/></span></div>
          <div className="character-label"><span>{character.name}</span><span>2D</span></div>
        </button>)}</div>
        <div className="library-note"><span className="note-icon"><UserRound size={18}/></span><div><strong>O‘z uslubingizda</strong><p>Rang, o‘lcham va pozani o‘ng panelda sozlang.</p></div></div>
      </>}
      {tab==='motions'&&!empty && <>
        <div className="section-label">Tayyor harakatlar <span>{motions.length} harakat</span></div>
        <div className="motion-list">{motions.map((motion,i)=><button key={motion.id} onClick={()=>onAddMotion(motion.id)} className="motion-card"><div className={`motion-icon motion-${i}`}><Waves size={23}/></div><div><strong>{motion.name}</strong><span>{(motion.durationMs/1000).toFixed(1)} s · {motion.loop?'Takroriy':'Bir martalik'}</span></div><Plus size={18}/></button>)}</div>
        <p className="subtle-note">Personajni tanlang. Harakat joriy vaqtga qo‘shiladi.</p>
      </>}
      {tab==='scene' && <>
        <div className="section-label">Obyekt qo‘shish</div>
        <button className="add-object" onClick={onAddText}><Type size={21}/><span>Matn qo‘shish</span><Plus size={18}/></button>
        <button className="add-object" onClick={onImportImage}><ImagePlus size={21}/><span>Rasm yuklash</span><Plus size={18}/></button>
        <div className="section-label spaced">Sahna rangi</div>
        <div className="background-swatches">{['#E9EEE7','#F4EEE3','#E5EBF3','#F1E5E4','#FFFFFF','#252D29'].map(color=><button key={color} aria-label={`Fon ${color}`} aria-pressed={background.type==='color'&&background.color.toLowerCase()===color.toLowerCase()} title={color} style={{background:color}} onClick={()=>onBackground(color)}/>)}</div>
        <label className="custom-color">Boshqa rang<input type="color" aria-label="Fon rangini tanlash" value={background.type==='color'?background.color.slice(0,7):'#FFFFFF'} onChange={e=>onBackground(e.target.value)}/></label>
      </>}
    </div>
    <div className="library-footer"><Sparkles size={16}/><span>Sizning g‘oyangiz. Sizning sahnangiz.</span></div>
  </aside>;
}
