import { useState, useEffect, useRef, useCallback } from "react";

const SOURCES = {
  DNS: { label:'DNS/RED',   color:'#00b4ff' },
  EDR: { label:'ENDPOINT',  color:'#00ffb4' },
  IAM: { label:'IDENTIDAD', color:'#ffaa00' },
};
// FORMA = entidad (qué máquina) · COLOR = fuente (qué sensor la vio)
const ENTITIES = ['srv-fin-01','host-mkt-14','user.mrivera','10.4.2.19','vpn-gw-02','host-dev-07'];
const SHAPES   = ['circle','square','triangle','diamond','hex','star'];
const shapeOf  = e => SHAPES[Math.max(0,ENTITIES.indexOf(e))%SHAPES.length];

// puntos normalizados (centro 0,0 · radio 1)
const POLY = {
  square:  [[-.82,-.82],[.82,-.82],[.82,.82],[-.82,.82]],
  triangle:[[0,-1],[.93,.6],[-.93,.6]],
  diamond: [[0,-1],[1,0],[0,1],[-1,0]],
  hex:     [[0,-1],[.87,-.5],[.87,.5],[0,1],[-.87,.5],[-.87,-.5]],
  star:    (()=>{const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const r=i%2?.45:1;
             p.push([Math.cos(a)*r,Math.sin(a)*r]);}return p;})(),
};

// ── Glifo SVG para el feed ──
function Glyph({shape,color,size=30,dim=false}){
  const c=size/2, r=size*0.42;
  const pts=POLY[shape];
  const common={fill:color,opacity:dim?0.45:1};
  if(shape==='circle') return (
    <svg width={size} height={size}><circle cx={c} cy={c} r={r} {...common}/></svg>
  );
  const d=pts.map(([x,y])=>`${c+x*r},${c+y*r}`).join(' ');
  return <svg width={size} height={size}><polygon points={d} {...common}/></svg>;
}
const SIGNALS = {
  DNS:['dominio recién registrado','volumen NXDOMAIN atípico','ASN no habitual','beaconing periódico','tunneling sospechoso'],
  EDR:['proceso sin firma en memoria','script codificado','persistencia en tarea','acceso masivo a archivos','inyección en proceso'],
  IAM:['login fuera de horario','MFA rechazado x3','geo nueva','escalamiento de privilegio','token reutilizado'],
};
const COMBO = {
  'DNS+EDR':     { label:'POSIBLE RANSOMWARE',   color:'#ff3300', pts:220 },
  'DNS+IAM':     { label:'POSIBLE EXFILTRACIÓN', color:'#ff0066', pts:260 },
  'EDR+IAM':     { label:'POSIBLE ROBO DE CUENTA',     color:'#ffcc00', pts:240 },
  'DNS+EDR+IAM': { label:'SEÑAL MULTIFUENTE',          color:'#cc00ff', pts:420 },
};
const GENERIC = { label:'ANOMALÍA', color:'#ff6600', pts:150 };

const BUCKET = 300;   // frames por segmento de la línea de tiempo (~5s)
const emptyStats = () => ({
  saldados:0, contenidos:0, brechas:0, fp:0, apt:0,
  evTotal:0, evCorr:0, evNoise:0, evBreach:0, evOver:0, evStageCleared:0,
  mttd:[], mttr:[], timeline:[]
});
const avg = a => a.length? a.reduce((x,y)=>x+y,0)/a.length : 0;
function logTL(st, frame, key){
  const i=Math.floor(frame/BUCKET);
  while(st.timeline.length<=i) st.timeline.push({det:0,mit:0,br:0});
  st.timeline[i][key]++;
}

const QUEUE_MAX = 10;
const STAGE_GOAL = 3;
export function stageConfig(index){
  const level=Math.floor((index-1)/3)+1, stage=(index-1)%3+1;
  return {level,stage,title:['Reconocer','Relacionar','Resolver'][stage-1],
    entityCount:stage===1?2:stage===2?4:6,
    sources:stage===1?['DNS','EDR']:['DNS','EDR','IAM'],
    speed:1+Math.min(level-1,8)*0.12,volume:stage===3?0.8:1};
}
export function stageIsComplete(st,base,remainingThreats){
  return st.saldados-base.saldados>=STAGE_GOAL &&
    st.contenidos-base.contenidos>=STAGE_GOAL && remainingThreats===0;
}
export function advanceClock(clock,now){
  if(clock.last===null)clock.last=now;
  clock.acc+=Math.min(Math.max(0,now-clock.last),100);clock.last=now;
  const count=Math.floor((clock.acc+1e-8)/(1000/60));
  clock.acc=Math.max(0,clock.acc-count*(1000/60));
  return count;
}
const ASSETS_START = 3;

// Ritmo: TTL = cuánto vive un evento · gap = frames entre eventos
// spd = velocidad de avance de amenazas · waveEvery = frames por oleada
const PACES = {
  pausado: { key:'pausado', label:'PAUSADO', ttl:2000, gap:190, gapMin:105, gapStep:5,
             spd:0.045, spdStep:0.003, unseenSpd:0.060, waveEvery:2600 },
  normal:  { key:'normal',  label:'NORMAL',  ttl:1450, gap:145, gapMin:70,  gapStep:6,
             spd:0.070, spdStep:0.005, unseenSpd:0.090, waveEvery:2100 },
  intenso: { key:'intenso', label:'INTENSO', ttl:900,  gap:95,  gapMin:38,  gapStep:6,
             spd:0.115, spdStep:0.009, unseenSpd:0.150, waveEvery:1500 },
};

let uid=0; const nid=()=>++uid;
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const comboOf=set=>COMBO[['DNS','EDR','IAM'].filter(s=>set.has(s)).join('+')]||GENERIC;
const multOf=c=>Math.min(1+Math.floor(c/2)*0.5, 4);


// ══ GRÁFICA DE DONA ══
function Donut({data,total,size=190}){
  const R=size/2, ro=R-6, ri=R*0.60;
  let acc=-Math.PI/2;
  const arcs=data.filter(d=>d.v>0).map(d=>{
    const frac=total>0?d.v/total:0;
    const a0=acc, a1=acc+frac*Math.PI*2; acc=a1;
    const large=(a1-a0)>Math.PI?1:0;
    const P=(r,a)=>`${R+Math.cos(a)*r} ${R+Math.sin(a)*r}`;
    // arco completo (evita el caso 100% degenerado)
    const path = frac>=0.9999
      ? `M ${R-ro} ${R} A ${ro} ${ro} 0 1 1 ${R+ro} ${R} A ${ro} ${ro} 0 1 1 ${R-ro} ${R} Z
         M ${R-ri} ${R} A ${ri} ${ri} 0 1 0 ${R+ri} ${R} A ${ri} ${ri} 0 1 0 ${R-ri} ${R} Z`
      : `M ${P(ro,a0)} A ${ro} ${ro} 0 ${large} 1 ${P(ro,a1)} L ${P(ri,a1)} A ${ri} ${ri} 0 ${large} 0 ${P(ri,a0)} Z`;
    return {...d,path,frac,fillRule:frac>=0.9999?'evenodd':'nonzero'};
  });
  return (
    <svg width={size} height={size} style={{display:'block'}}>
      <circle cx={R} cy={R} r={(ro+ri)/2} fill="none" stroke="#061019" strokeWidth={ro-ri}/>
      {arcs.map((a,i)=>(
        <path key={i} d={a.path} fill={a.c} fillRule={a.fillRule}
          stroke="#02060c" strokeWidth="2.5" strokeLinejoin="round"/>
      ))}
      <text x={R} y={R-8} textAnchor="middle" fill="#ffffff" fontSize="30"
        fontWeight="900" fontFamily="monospace">{total}</text>
      <text x={R} y={R+13} textAnchor="middle" fill="#5a7a8a" fontSize="10"
        letterSpacing="2" fontFamily="monospace">EVENTOS</text>
    </svg>
  );
}

// ══ LÍNEA DE TIEMPO: detectadas / mitigadas / brechas ══
function Timeline({tl,w=320,h=120}){
  const pad={l:26,r:8,t:10,b:20};
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  const n=Math.max(tl.length,1);
  const max=Math.max(1,...tl.map(b=>Math.max(b.det,b.mit,b.br)));
  const X=i=>pad.l+(n===1?iw/2:(i/(n-1))*iw);
  const Y=v=>pad.t+ih-(v/max)*ih;
  const line=(key)=>tl.map((b,i)=>`${i?'L':'M'} ${X(i)} ${Y(b[key])}`).join(' ');
  const series=[
    {k:'det',c:'#00b4ff',label:'DETECTADAS'},
    {k:'mit',c:'#00ffb4',label:'MITIGADAS'},
    {k:'br', c:'#ff3344',label:'BRECHAS'},
  ];
  return (
    <div style={{width:'100%'}}>
      <svg width={w} height={h} style={{display:'block',maxWidth:'100%'}}>
        {[0,.5,1].map(f=>(
          <g key={f}>
            <line x1={pad.l} x2={w-pad.r} y1={pad.t+ih*(1-f)} y2={pad.t+ih*(1-f)}
              stroke="#0a2436" strokeWidth="1"/>
            <text x={pad.l-5} y={pad.t+ih*(1-f)+3} textAnchor="end" fill="#3a5a72"
              fontSize="8" fontFamily="monospace">{Math.round(max*f)}</text>
          </g>
        ))}
        {series.map(sr=>(
          <g key={sr.k}>
            <path d={line(sr.k)} fill="none" stroke={sr.c} strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round"/>
            {tl.map((b,i)=><circle key={i} cx={X(i)} cy={Y(b[sr.k])} r="2.4" fill={sr.c}/>)}
          </g>
        ))}
        <text x={pad.l} y={h-5} fill="#3a5a72" fontSize="8" fontFamily="monospace">inicio</text>
        <text x={w-pad.r} y={h-5} textAnchor="end" fill="#3a5a72" fontSize="8" fontFamily="monospace">fin del turno</text>
      </svg>
      <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:4,flexWrap:'wrap'}}>
        {series.map(sr=>(
          <span key={sr.k} style={{fontSize:9,color:sr.c,display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:11,height:3,background:sr.c,display:'inline-block'}}/>{sr.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RiskFlowTriage(){
  const [phase,setPhase]=useState('title');     // title | tut | play | over
  const [tutStep,setTutStep]=useState(0);       // 0=correlacionar 1=contener 2=listo
  const [score,setScore]=useState(0);
  const [assets,setAssets]=useState(ASSETS_START);
  const [wave,setWave]=useState(1);
  const [feed,setFeed]=useState([]);
  const [sel,setSel]=useState([]);
  const [toast,setToast]=useState(null);
  const [hs,setHs]=useState(0);
  const [dims,setDims]=useState({w:340,h:210});
  const [stats,setStats]=useState(emptyStats());
  const [threatCount,setThreatCount]=useState(0);
  const [pace,setPace]=useState('pausado');
  const [combo,setCombo]=useState(0);
  const [aptMoment,setAptMoment]=useState(null);

  const stageBase=useRef({saldados:0,contenidos:0});
  const cvs=useRef(null), anim=useRef(null);
  const S=useRef({threats:[],spawnT:60,frame:0,shake:0,ring:0});
  const feedR=useRef([]), selR=useRef([]);
  const scoreR=useRef(0), assetsR=useRef(ASSETS_START), waveR=useRef(1);
  const statsR=useRef(emptyStats());
  const phaseR=useRef('title'), tutR=useRef(0);
  const paceR=useRef(PACES.pausado);
  const comboR=useRef(0), bestComboR=useRef(0);

  useEffect(()=>{phaseR.current=phase;},[phase]);
  useEffect(()=>{tutR.current=tutStep;},[tutStep]);
  useEffect(()=>{paceR.current=PACES[pace];},[pace]);
  useEffect(()=>{window.storage?.get('rf_triage_hs').then(r=>r&&setHs(Number(r.value)||0)).catch(()=>{});},[]);

  useEffect(()=>{
    const up=()=>{
      const w=Math.min(window.innerWidth-8,460);
      const h=Math.max(170,Math.min(Math.round(window.innerHeight*0.33),300));
      setDims({w,h});
    };
    up();window.addEventListener('resize',up);return()=>window.removeEventListener('resize',up);
  },[]);

  const flash=(msg,kind='ok')=>{setToast({msg,kind});setTimeout(()=>setToast(null),1400);};

  // ── TUTORIAL ──
  const startTutorial=useCallback(()=>{
    uid=0; scoreR.current=0; assetsR.current=ASSETS_START; waveR.current=1;
    statsR.current=emptyStats();
    comboR.current=0; setCombo(0); setAptMoment(null);
    S.current={threats:[],spawnT:9999,frame:0,shake:0,ring:0};
    // dos eventos correlacionables + uno de distracción
    feedR.current=[
      {id:nid(),src:'EDR',entity:'host-mkt-14',msg:'script codificado',ttl:paceR.current.ttl,tut:true},
      {id:nid(),src:'IAM',entity:'srv-fin-01', msg:'MFA rechazado x3',ttl:paceR.current.ttl},
      {id:nid(),src:'DNS',entity:'10.4.2.19',  msg:'ASN no habitual',ttl:paceR.current.ttl},
      {id:nid(),src:'DNS',entity:'host-mkt-14',msg:'beaconing periódico',ttl:paceR.current.ttl,tut:true},
    ];
    selR.current=[];
    setFeed([...feedR.current]);setSel([]);setThreatCount(0);
    setScore(0);setAssets(ASSETS_START);setWave(1);
    setTutStep(0);setPhase('tut');
  },[]);

  const startReal=useCallback(()=>{
    uid=0; scoreR.current=0; assetsR.current=ASSETS_START; waveR.current=1;
    statsR.current=emptyStats();stageBase.current={saldados:0,contenidos:0};
    comboR.current=0; bestComboR.current=0; setCombo(0); setAptMoment(null);
    S.current={threats:[],spawnT:Math.round(paceR.current.gap*0.7),frame:0,shake:0,ring:0};
    feedR.current=['DNS','EDR'].map(src=>({id:nid(),src,entity:ENTITIES[0],msg:SIGNALS[src][0],ttl:paceR.current.ttl,born:0}));
    statsR.current.evTotal=2;selR.current=[];
    phaseR.current='play';setToast(null);
    setScore(0);setAssets(ASSETS_START);setWave(1);setFeed([...feedR.current]);setSel([]);
    setStats(emptyStats());setThreatCount(0);
    setPhase('play');
  },[]);

  const nextStage=useCallback(()=>{
    if(phaseR.current!=='stageClear')return;
    statsR.current.evStageCleared+=feedR.current.length;
    waveR.current++;setWave(waveR.current);
    stageBase.current={saldados:statsR.current.saldados,contenidos:statsR.current.contenidos};
    S.current={threats:[],spawnT:paceR.current.gap,frame:S.current.frame,shake:0,ring:0};
    const entity=ENTITIES[(waveR.current-1)%stageConfig(waveR.current).entityCount];
    feedR.current=['DNS','EDR'].map(src=>({id:nid(),src,entity,msg:SIGNALS[src][0],ttl:paceR.current.ttl,born:S.current.frame}));
    statsR.current.evTotal+=2;selR.current=[];
    setFeed([...feedR.current]);setSel([]);setThreatCount(0);setStats({...statsR.current});
    setToast(null);setAptMoment(null);phaseR.current='play';setPhase('play');
  },[]);

  const spawnEvent=useCallback((entity,forceSrc)=>{
    const cfg=stageConfig(waveR.current);
    const src=forceSrc||rnd(cfg.sources);
    statsR.current.evTotal++;
    feedR.current=[{id:nid(),src,entity:entity||rnd(ENTITIES.slice(0,cfg.entityCount)),msg:rnd(SIGNALS[src]),
      ttl:paceR.current.ttl,born:S.current.frame},...feedR.current];
    setFeed([...feedR.current]);
  },[]);

  const spawnUnseen=useCallback(entity=>{
    const {w,h}=dims;
    S.current.threats.push({id:nid(),entity,ang:Math.random()*Math.PI*2,r:Math.min(w,h)*0.46,
      revealed:false,info:GENERIC,spd:paceR.current.unseenSpd*stageConfig(waveR.current).speed,pulse:Math.random()*6});
    setThreatCount(S.current.threats.length);
  },[dims]);

  // ── correlacionar ──
  const tapEvent=useCallback(ev=>{
    const ph=phaseR.current;
    if(ph!=='play'&&ph!=='tut')return;
    if(ph==='tut'&&tutR.current!==0)return;
    let s=selR.current;
    if(s.find(e=>e.id===ev.id)) s=s.filter(e=>e.id!==ev.id);
    else if(s.length<3) s=[...s,ev];
    else return;
    selR.current=s; setSel([...s]);
  },[]);

  // ── SALDAR: confirma la correlación seleccionada ──
  const saldar=useCallback(()=>{
    const ph=phaseR.current;
    if(ph!=='play'&&ph!=='tut')return;
    const s=selR.current;
    if(s.length<2)return;
    if(!s.every(ev=>feedR.current.some(x=>x.id===ev.id))){selR.current=[];setSel([]);return;}

    const same=s.every(e=>e.entity===s[0].entity);
    const srcs=new Set(s.map(e=>e.src));

    if(!(same&&srcs.size>=2)){
      if(ph==='tut'){selR.current=[];setSel([]);flash('Esos no coinciden — intenta otros','warn');return;}
      scoreR.current=Math.max(0,scoreR.current-90);setScore(scoreR.current);
      statsR.current.fp++;
      const had=comboR.current>=2; comboR.current=0;setCombo(0);
      setStats({...statsR.current});
      selR.current=[];setSel([]);
      flash(had?'CORRELACIÓN INCORRECTA −90 · COMBO ROTO':'CORRELACIÓN INCORRECTA −90','bad');
      return;
    }

    const info=comboOf(srcs);
    const isApt=srcs.size===3;
    if(ph==='play'){
      comboR.current++;
      if(comboR.current>bestComboR.current)bestComboR.current=comboR.current;
      setCombo(comboR.current);
    }
    const mult=ph==='play'?multOf(comboR.current):1;
    const pts=Math.round((70*s.length+(isApt?150:0))*mult);
    scoreR.current+=pts;setScore(scoreR.current);

    const ST=statsR.current, F=S.current.frame;
    ST.saldados++; ST.evCorr+=s.length;
    ST.mttd.push((F-Math.min(...s.map(e=>e.born??F)))/60);
    logTL(ST,F,'det');
    if(isApt)ST.apt=(ST.apt||0)+1;
    setStats({...ST});

    if(isApt&&ph==='play'){
      S.current.aptFlash=26; S.current.shake=10;
      setAptMoment({pts,mult}); setTimeout(()=>setAptMoment(null),1900);
    }

    const hidden=S.current.threats.find(t=>!t.revealed&&t.entity===s[0].entity);
    if(hidden){
      hidden.revealed=true;hidden.info=info;hidden.revAt=F;
      flash(`HIPÓTESIS REVELADA · ${info.label} +${pts}${mult>1?` ×${mult}`:''}`,'ok');
    } else {
      const {w,h}=dims;
      S.current.threats.push({id:nid(),entity:s[0].entity,ang:-Math.PI/2,
        r:Math.min(w,h)*0.42,revealed:true,info,revAt:F,
        spd:ph==='tut'?0:paceR.current.spd*stageConfig(waveR.current).speed,pulse:0});
      if(!isApt)flash(`CORRELACIÓN · ${info.label} +${pts}${mult>1?` ×${mult}`:''}`,'ok');
    }
    setThreatCount(S.current.threats.length);
    feedR.current=feedR.current.filter(e=>!s.find(x=>x.id===e.id));
    setFeed([...feedR.current]);
    selR.current=[];setSel([]);
    if(ph==='tut')setTutStep(1);
  },[dims]);

  // ── contener ──
  const tapArena=useCallback(e=>{
    const ph=phaseR.current;
    if(ph!=='play'&&ph!=='tut')return;
    if(ph==='tut'&&tutR.current!==1)return;
    const rect=cvs.current.getBoundingClientRect();
    const px=(e.clientX-rect.left)*dims.w/rect.width;
    const py=(e.clientY-rect.top)*dims.h/rect.height;
    const {w,h}=dims;const cx=w/2,cy=h/2;
    const hit=S.current.threats.filter(t=>t.revealed)
      .map(t=>({t,d:Math.hypot(cx+Math.cos(t.ang)*t.r-px,cy+Math.sin(t.ang)*t.r-py)}))
      .filter(o=>o.d<38).sort((a,b)=>a.d-b.d)[0];
    if(hit){
      S.current.threats=S.current.threats.filter(t=>t.id!==hit.t.id);
      const cm=ph==='play'?multOf(comboR.current):1;
      scoreR.current+=Math.round(hit.t.info.pts*cm);setScore(scoreR.current);
      const ST=statsR.current, F=S.current.frame;
      ST.contenidos++;
      if(hit.t.revAt!=null) ST.mttr.push((F-hit.t.revAt)/60);
      logTL(ST,F,'mit');
      setStats({...ST});
      S.current.ring=14;setThreatCount(S.current.threats.length);
      flash(`${hit.t.info.label} CONTENIDO +${Math.round(hit.t.info.pts*cm)}${cm>1?` ×${cm}`:''}`,'ok');
      if(ph==='tut')setTutStep(2);
      if(ph==='play'&&stageIsComplete(ST,stageBase.current,S.current.threats.length)){
        phaseR.current='stageClear';setPhase('stageClear');setToast(null);setAptMoment(null);
      }
    }
  },[dims]);

  // ── loop ──
  useEffect(()=>{
    if(phase!=='play'&&phase!=='tut'){cancelAnimationFrame(anim.current);return;}
    const c=cvs.current;if(!c)return;
    const ctx=c.getContext('2d');
    const {w,h}=dims;const cx=w/2,cy=h/2;const CORE=28;
    const live = phase==='play';

    const over=()=>{
      if(scoreR.current>hs){window.storage?.set('rf_triage_hs',String(scoreR.current),false).catch(()=>{});setHs(scoreR.current);}
      phaseR.current='over';setPhase('over');
    };
    const loseAsset=msg=>{
      if(phaseR.current!=='play')return;
      assetsR.current=Math.max(0,assetsR.current-1);setAssets(assetsR.current);
      comboR.current=0;setCombo(0);
      S.current.shake=16;flash(msg,'bad');
      if(assetsR.current<=0)over();
    };

    function tick(){
      if(phaseR.current!==phase)return;
      const s=S.current;s.frame++;
      if(s.shake>0)s.shake--;
      if(s.ring>0)s.ring--;
      if(s.aptFlash>0)s.aptFlash--;
      if(!live){s.threats.forEach(t=>t.pulse+=0.07);return;}

      s.spawnT--;
      if(s.spawnT<=0){
        const P=paceR.current,cfg=stageConfig(waveR.current); s.spawnT=Math.max(P.gapMin,P.gap*cfg.volume);
        const cur=feedR.current;
        if(cur.length>0&&Math.random()<0.62){
          // buscar entidades que ya tienen 2 fuentes distintas -> completar el tercio
          const byEnt={};
          cur.forEach(e=>{(byEnt[e.entity]=byEnt[e.entity]||new Set()).add(e.src);});
          const casi=Object.keys(byEnt).filter(k=>byEnt[k].size===2);
          if(casi.length&&Math.random()<0.55){
            const ent=rnd(casi);
            const falta=stageConfig(waveR.current).sources.find(x=>!byEnt[ent].has(x));
            spawnEvent(ent,falta);
          } else {
            const candidate=rnd(cur),cfg=stageConfig(waveR.current);
            const missing=cfg.sources.filter(src=>!cur.some(ev=>ev.entity===candidate.entity&&ev.src===src));
            spawnEvent(candidate.entity,missing.length?rnd(missing):undefined);
          }
        } else spawnEvent();
      }

      let ch=false;const keep=[];
      for(const ev of feedR.current){
        ev.ttl--;
        if(ev.ttl<=0){
          ch=true;
          const sib=feedR.current.filter(o=>o.id!==ev.id&&o.entity===ev.entity&&o.src!==ev.src);
          if(sib.length>0){
            statsR.current.evBreach++;
            if(!s.threats.find(t=>!t.revealed&&t.entity===ev.entity))spawnUnseen(ev.entity);
          } else statsR.current.evNoise++;
        } else keep.push(ev);
      }
      if(ch){feedR.current=keep;setFeed([...keep]);
        selR.current=selR.current.filter(x=>keep.find(k=>k.id===x.id));setSel([...selR.current]);}

      if(feedR.current.length>QUEUE_MAX){
        statsR.current.evOver+=feedR.current.length-QUEUE_MAX;
        feedR.current=feedR.current.slice(0,QUEUE_MAX);setFeed([...feedR.current]);
        selR.current=selR.current.filter(ev=>feedR.current.some(x=>x.id===ev.id));setSel([...selR.current]);
        loseAsset('BACKLOG DESBORDADO · ALERT FATIGUE');
      }

      if(phaseR.current!=='play')return;
      s.threats=s.threats.filter(t=>{
        if(phaseR.current!=='play')return true;
        t.pulse+=0.07;t.r-=t.spd;
        if(t.r<=CORE){
          statsR.current.brechas++;
          logTL(statsR.current,s.frame,'br');
          setStats({...statsR.current});
          loseAsset(t.revealed?'AMENAZA ALCANZÓ EL ACTIVO':'BRECHA NO DETECTADA');
          return false;
        }
        return true;
      });
      setThreatCount(s.threats.length);


    }

    function shapePath(shape,x,y,r){
      ctx.beginPath();
      if(shape==='circle'){ctx.arc(x,y,r,0,7);return;}
      const pts=POLY[shape];
      pts.forEach(([px,py],i)=>{const X=x+px*r,Y=y+py*r; i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});
      ctx.closePath();
    }

    function draw(){
      const s=S.current;
      const sx=s.shake>0?(Math.random()-.5)*s.shake*.5:0;
      const sy=s.shake>0?(Math.random()-.5)*s.shake*.5:0;
      ctx.save();ctx.translate(sx,sy);
      ctx.fillStyle='#04080f';ctx.fillRect(-10,-10,w+20,h+20);

      for(let i=1;i<=4;i++){
        ctx.strokeStyle=`rgba(0,120,200,${.13-i*.015})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(cx,cy,CORE+i*(Math.min(w,h)*.11),0,7);ctx.stroke();
      }
      const sw=((Date.now()/2600)%1)*Math.PI*2;
      const g=ctx.createLinearGradient(cx,cy,cx+Math.cos(sw)*140,cy+Math.sin(sw)*140);
      g.addColorStop(0,'rgba(0,255,180,.16)');g.addColorStop(1,'rgba(0,255,180,0)');
      ctx.strokeStyle=g;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(sw)*160,cy+Math.sin(sw)*160);ctx.stroke();

      if(s.ring>0){
        ctx.strokeStyle=`rgba(0,255,180,${s.ring/14*.6})`;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(cx,cy,CORE+(14-s.ring)*6,0,7);ctx.stroke();
      }

      const dead=assetsR.current<=0;
      ctx.fillStyle=dead?'#3a1015':'#062032';
      ctx.beginPath();ctx.arc(cx,cy,CORE,0,7);ctx.fill();
      ctx.strokeStyle=dead?'#ff3344':'#00b4ff';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(cx,cy,CORE,0,7);ctx.stroke();
      ctx.fillStyle=dead?'#ff3344':'#00ffb4';
      ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('ACTIVOS',cx,cy-7);
      ctx.font='bold 18px monospace';ctx.fillText(String(Math.max(0,assetsR.current)),cx,cy+9);

      s.threats.forEach(t=>{
        const x=cx+Math.cos(t.ang)*t.r,y=cy+Math.sin(t.ang)*t.r;
        if(t.revealed){
          const gl=.55+Math.sin(t.pulse)*.45;
          ctx.strokeStyle=t.info.color+'33';ctx.lineWidth=1;ctx.setLineDash([2,4]);
          ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(cx,cy);ctx.stroke();ctx.setLineDash([]);
          ctx.strokeStyle=t.info.color;ctx.globalAlpha=gl*.55;ctx.lineWidth=2;
          ctx.beginPath();ctx.arc(x,y,22,0,7);ctx.stroke();ctx.globalAlpha=1;
          ctx.fillStyle=t.info.color; shapePath(shapeOf(t.entity),x,y,11); ctx.fill();
          ctx.strokeStyle='#04080f'; ctx.lineWidth=1.5; ctx.stroke();
          ctx.font='bold 10px monospace';ctx.fillStyle=t.info.color;ctx.textAlign='center';
          ctx.fillText(t.info.label,x,y-24);
          ctx.font='9px monospace';ctx.fillStyle='#a9c4d4';ctx.fillText(t.entity,x,y+28);
        } else {
          ctx.globalAlpha=.17+Math.sin(t.pulse)*.08;
          ctx.fillStyle='#ff2255'; shapePath(shapeOf(t.entity),x,y,10); ctx.fill();
          ctx.globalAlpha=1;
        }
      });
      if(s.aptFlash>0){
        const a=s.aptFlash/26;
        // El destello se limita al anillo; no cubre el radar.
        ctx.strokeStyle=`rgba(204,0,255,${a})`;ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(cx,cy,CORE+(26-s.aptFlash)*7,0,7);ctx.stroke();
      }
      ctx.restore();
    }

    // Fixed 60 Hz simulation: display refresh rate only affects drawing.
    const clock={last:null,acc:0};
    function resetClock(){clock.last=null;clock.acc=0;}
    document.addEventListener('visibilitychange',resetClock);
    function loop(now){
      if(phaseR.current!==phase)return;
      if(document.hidden){resetClock();anim.current=requestAnimationFrame(loop);return;}
      const ticks=advanceClock(clock,now);
      for(let i=0;i<ticks&&phaseR.current===phase;i++)tick();
      draw();
      if(phaseR.current===phase)anim.current=requestAnimationFrame(loop);
    }
    anim.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(anim.current);document.removeEventListener('visibilitychange',resetClock);};
  },[phase,dims,hs,spawnEvent,spawnUnseen]);

  const embedded=typeof window!=='undefined'&&window.self!==window.top;
  const {w,h}=dims;
  const load=feed.length/QUEUE_MAX;
  const lc=load>.8?'#ff3344':load>.55?'#ffaa00':'#00ffb4';
  const inGame = phase==='play'||phase==='tut';
  const currentStage=stageConfig(wave);
  const stageCorrelations=Math.min(STAGE_GOAL,stats.saldados-stageBase.current.saldados);
  const stageContained=Math.min(STAGE_GOAL,stats.contenidos-stageBase.current.contenidos);

  // resaltar en tutorial
  const tutHighlight=(ev)=> phase==='tut'&&tutStep===0&&ev.tut;

  return(
    <div className="triage-root" style={{width:'100vw',height:'100vh',background:'#02060c',color:'#00b4ff',
      fontFamily:'"Courier New",monospace',display:'flex',flexDirection:'column',
      alignItems:'center',overflow:'hidden',boxSizing:'border-box',padding:'4px 0',userSelect:'none'}}>
      <style>{`
        .triage-root{height:100dvh!important;padding-top:max(4px,env(safe-area-inset-top))!important;padding-bottom:max(4px,env(safe-area-inset-bottom))!important}
        .mobile-launch{display:none}
        @media(max-width:600px){.mobile-launch{display:block;max-width:300px;margin:10px auto 0;padding:11px 14px;border:1px solid #00b4ff;color:#00b4ff;text-decoration:none;font-size:11px;line-height:1.4;letter-spacing:0}}
        @keyframes bl{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes si{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,180,.5)}50%{box-shadow:0 0 0 5px rgba(0,255,180,0)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
        @keyframes aptin{0%{transform:scale(.5);opacity:0}
          35%{transform:scale(1.14);opacity:1}55%{transform:scale(1)}
          80%{opacity:1}100%{transform:scale(1.05);opacity:0}}
        @keyframes cbo{0%,100%{opacity:1}50%{opacity:.45}}
        .aptin{animation:aptin 1.9s ease-out forwards}
        .cbo{animation:cbo .7s infinite}
        .bl{animation:bl .9s infinite}.ev{animation:si .16s ease-out}
        .hl{animation:pulse 1.2s infinite}
        .bnc{animation:bounce 1s infinite}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#0a3a5a}
      `}</style>

      {inGame&&<div style={{width:w,display:'flex',justifyContent:'space-between',alignItems:'center',
        fontSize:12.11,padding:'2px 8px',boxSizing:'border-box'}}>
        <span>SC <b style={{color:'#00ffb4'}}>{score}</b>
          {combo>=2&&<span
            className="cbo" style={{color:'#cc00ff',marginLeft:6,fontWeight:900,fontSize:11.31}}>×{multOf(combo)}</span>}
        </span>
        <span style={{color:'#ffcc00'}}>{phase==='tut'?'TUTORIAL':`N${currentStage.level} · E${currentStage.stage}/3`}
          {phase==='play'&&<span style={{color:'#3a5a72',fontSize:10.45,marginLeft:5}}>{PACES[pace].label}</span>}
        </span>
        <span>{'◈'.repeat(Math.max(0,assets))}{hs>0&&<span style={{color:'#3a5a72',marginLeft:6,fontSize:10.45}}>HS {hs}</span>}</span>
      </div>}


      {/* Avisos fuera del radar: espacio fijo para no tapar ni desplazar amenazas. */}
      {inGame&&(
        <div data-radar-status="" role="status" aria-live="polite" aria-atomic="true"
          style={{width:w,height:44,flexShrink:0,boxSizing:'border-box',padding:'3px 6px',
            display:'flex',flexDirection:'column',justifyContent:'center',textAlign:'center',
            pointerEvents:'none',overflow:'hidden',fontSize:10.45,lineHeight:1.3}}>
          <div style={{fontWeight:700,color:toast?.kind==='bad'?'#ff4455':aptMoment?'#cc00ff':toast?.kind==='warn'?'#ffcc00':'#00ffb4'}}>
            {toast?.kind==='bad'?toast.msg:aptMoment?`TRIPLE CORRELACIÓN +${aptMoment.pts}`:toast?.msg||(phase==='play'?`${currentStage.title} · Conectar ${stageCorrelations}/3 · Contener ${stageContained}/3`:'Conecta señales · protege tus activos')}
          </div>
          <div style={{color:'#8aa8bb',fontSize:10}}>
            {phase==='tut'?(tutStep===0?'① Misma figura, distinto color → CORRELACIONAR':tutStep===1?'② Toca la amenaza en el radar para contenerla':'Tutorial completado'):
              threatCount>0?'↓ Toca la amenaza para contenerla':'Selecciona eventos de la misma figura y distinto color'}
          </div>
        </div>
      )}

      {/* RADAR */}
      <div style={{position:'relative',border:'1px solid #0a3a5a',marginTop:3,boxShadow:'0 0 18px rgba(0,120,220,.16)'}}>
        <canvas ref={cvs} width={w} height={h} onPointerDown={tapArena}
          style={{display:'block',touchAction:'manipulation'}}/>

        {/* TUTORIAL: paso 3 = listo */}
        {phase==='tut'&&tutStep===2&&(
          <div style={{position:'absolute',inset:0,background:'rgba(2,6,12,.93)',display:'flex',
            flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:14,textAlign:'center'}}>
            <div style={{fontSize:15.34,color:'#00ffb4',letterSpacing:3}}>ESO ES TODO</div>
            <div style={{fontSize:10.45,color:'#7799aa',lineHeight:1.9,maxWidth:300}}>
              <b style={{color:'#00ffb4'}}>Misma figura, distinto color</b> → CORRELACIONAR.<br/>
              Luego tocas la amenaza en el radar.<br/>
              <b style={{color:'#cc00ff'}}>Tres fuentes sobre una misma entidad refuerzan la hipótesis</b>
              — suma más puntos, pero arriesgas que caduquen.<br/><br/>
              En el turno real los eventos <b>caducan</b>. Si dejas escapar un par que sí coincidía,
              la amenaza nace de todos modos — pero <b style={{color:'#ff4455'}}>invisible</b> y no la puedes tocar.<br/><br/>
              <span style={{color:'#ffcc00'}}>Y si se te acumulan 10 eventos, pierdes un activo.</span>
            </div>
            <button onClick={startReal} className="bl" style={{marginTop:10,padding:'12px 30px',fontSize:11.31,
              fontFamily:'inherit',background:'transparent',border:'2px solid #00ffb4',color:'#00ffb4',
              letterSpacing:2,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>EMPEZAR TURNO</button>
          </div>
        )}

        {phase==='title'&&(
          <div style={{position:'absolute',inset:0,background:'rgba(2,6,12,.95)',display:'flex',
            flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,padding:12,textAlign:'center'}}>
            <div style={{fontSize:8,color:'#3a5a72',letterSpacing:3}}>SYNAPPSSYS LABS</div>
            <div style={{fontSize:16.96,fontWeight:900,color:'#00b4ff',letterSpacing:2,textShadow:'0 0 14px #00b4ff'}}>RiskFlow</div>
            <div style={{fontSize:10.5,fontWeight:900,color:'#00ffb4',letterSpacing:3}}>TRIAGE</div>
            <div style={{fontSize:9,color:'#7799aa',lineHeight:1.8,marginTop:6,maxWidth:280}}>
              Un solo gesto en todo el juego: <b style={{color:'#00ffb4'}}>tocar</b>.<br/>
              Abajo emparejas eventos. Arriba contienes amenazas.
            </div>

            <div style={{marginTop:8,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{fontSize:8,color:'#3a5a72',letterSpacing:2}}>RITMO</div>
              <div style={{display:'flex',gap:4}}>
                {Object.values(PACES).map(p=>(
                  <button key={p.key} onClick={()=>setPace(p.key)}
                    style={{padding:'4px 9px',fontSize:8,fontFamily:'inherit',letterSpacing:1,
                      background:pace===p.key?'rgba(0,255,180,.16)':'transparent',
                      border:`1px solid ${pace===p.key?'#00ffb4':'#2a4a5a'}`,
                      color:pace===p.key?'#00ffb4':'#5a7a8a',cursor:'pointer',
                      WebkitTapHighlightColor:'transparent'}}>{p.label}</button>
                ))}
              </div>
            </div>
            <button onClick={startTutorial} className="bl" style={{marginTop:8,padding:'8px 22px',fontSize:10,
              fontFamily:'inherit',background:'transparent',border:'2px solid #00ffb4',color:'#00ffb4',
              letterSpacing:2,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>CÓMO SE JUEGA</button>
            <button onClick={startReal} style={{marginTop:2,padding:'5px 14px',fontSize:9,
              fontFamily:'inherit',background:'transparent',border:'1px solid #2a4a5a',color:'#5a7a8a',
              letterSpacing:1,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>saltar tutorial</button>
          </div>
        )}

      </div>

      {/* BARRA SALDAR */}
      {inGame&&(()=>{
        const n=sel.length;
        const same=n>0&&sel.every(e=>e.entity===sel[0].entity);
        const srcs=new Set(sel.map(e=>e.src));
        const valid=n>=2&&same&&srcs.size>=2;
        const isApt=valid&&srcs.size===3;
        // ¿hay una tercera fuente disponible para esta entidad?
        const tercera = valid&&srcs.size===2&&feed.some(e=>
          e.entity===sel[0].entity&&!srcs.has(e.src)&&!sel.find(x=>x.id===e.id));
        const mult=multOf(comboR.current+1);
        const pts=valid?Math.round((70*n+(isApt?150:0))*(phase==='play'?mult:1)):0;
        const bg   = n<2?'rgba(10,30,45,.5)': valid?(isApt?'rgba(204,0,255,.2)':'rgba(0,255,180,.18)'):'rgba(255,50,68,.16)';
        const bd   = n<2?'#1a3a4a':          valid?(isApt?'#cc00ff':'#00ffb4'):'#ff3344';
        const fg   = n<2?'#3a5a72':          valid?(isApt?'#e07aff':'#00ffb4'):'#ff5566';
        const label= n===0?'SELECCIONA 2 O 3 EVENTOS'
                   : n===1?'FALTA AL MENOS UNO MÁS'
                   : valid?(isApt?`⚡ CORRELACIONAR ×3  +${pts}`:`CORRELACIONAR ×${n}  +${pts}`)
                   : 'NO COINCIDEN';
        return (
          <div style={{width:w,marginTop:4,boxSizing:'border-box',padding:'0 1px'}}>
            <div onClick={n>=2?saldar:undefined}
              className={valid?'bl':''}
              style={{width:'100%',padding:'13px 10px',textAlign:'center',
                background:bg,border:`2px solid ${bd}`,color:fg,
                fontSize:12.11,fontWeight:900,letterSpacing:2,fontFamily:'inherit',
                cursor:n>=2?'pointer':'default',boxSizing:'border-box',
                boxShadow:valid?`0 0 16px ${isApt?'rgba(204,0,255,.35)':'rgba(0,255,180,.3)'}`:'none',
                WebkitTapHighlightColor:'transparent'}}>
              {label}
            </div>
            {tercera&&(
              <div style={{textAlign:'center',fontSize:10.45,color:'#cc00ff',padding:'4px 0',
                letterSpacing:1}} className="cbo">
                ⚡ hay una TERCERA señal de esta entidad — súmala a la correlación
              </div>
            )}
          </div>
        );
      })()}

      {/* CARRIL */}
      <div style={{width:w,marginTop:4,flex:1,minHeight:0,display:'flex',flexDirection:'column',
        border:'1px solid #0a3a5a',boxSizing:'border-box',background:'rgba(0,20,40,.22)'}}>
        <div style={{display:'flex',justifyContent:'space-between',padding:'4px 7px',
          borderBottom:'1px solid #0a3a5a',fontSize:10.5,letterSpacing:1,flexShrink:0,fontWeight:700}}>
          <span>◈ MISMA FIGURA · DISTINTO COLOR</span>
          <span style={{color:lc,fontWeight:900,fontSize:12.11}}>{feed.length}/{QUEUE_MAX}</span>
        </div>
        <div style={{height:4,background:'#08243a',flexShrink:0}}>
          <div style={{height:'100%',width:`${Math.min(100,load*100)}%`,background:lc,transition:'width .2s'}}/>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:2}}>
          {feed.length===0&&<div style={{fontSize:10.5,color:'#2a4a5a',textAlign:'center',padding:22}}>esperando eventos…</div>}
          {feed.map(ev=>{
            const isSel=sel.find(e=>e.id===ev.id);
            const src=SOURCES[ev.src];
            const life=ev.ttl/paceR.current.ttl;
            const hl=tutHighlight(ev);
            return(
              <div key={ev.id} className={`ev${hl?' hl':''}`} onClick={()=>tapEvent(ev)}
                style={{display:'flex',alignItems:'stretch',marginBottom:4,
                  background:isSel?'rgba(0,255,180,.16)':hl?'rgba(0,255,180,.07)':'rgba(0,40,70,.32)',
                  borderLeft:`5px solid ${isSel?'#00ffb4':src.color}`,cursor:'pointer',
                  opacity: phase==='tut'&&tutStep!==0?0.35:1,
                  WebkitTapHighlightColor:'transparent'}}>

                {/* check */}
                <div style={{display:'flex',alignItems:'center',padding:'0 8px 0 8px',flexShrink:0}}>
                  <div style={{width:22,height:22,borderRadius:4,
                    border:`2px solid ${isSel?'#00ffb4':'#2a4a5a'}`,
                    background:isSel?'#00ffb4':'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:11.31,color:'#02060c',fontWeight:900,lineHeight:1}}>{isSel?'✓':''}</div>
                </div>

                {/* GLIFO: forma=máquina · color=sensor */}
                <div style={{display:'flex',alignItems:'center',paddingRight:11,flexShrink:0}}>
                  <Glyph shape={shapeOf(ev.entity)} color={src.color} size={38}/>
                </div>

                {/* contenido */}
                <div style={{flex:1,minWidth:0,padding:'8px 0'}}>
                  <div style={{color:'#ffd24d',fontSize:12.11,fontWeight:900,letterSpacing:.5,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.2}}>
                    {ev.entity}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:7,marginTop:3}}>
                    <span style={{color:'#02060c',background:src.color,fontSize:10,fontWeight:900,
                      padding:'2px 6px',letterSpacing:.5,flexShrink:0,borderRadius:2}}>{src.label}</span>
                    <span style={{color:'#8aa8bb',fontSize:10,whiteSpace:'nowrap',
                      overflow:'hidden',textOverflow:'ellipsis'}}>{ev.msg}</span>
                  </div>
                </div>

                {/* vida */}
                <div style={{width:5,background:'#0a2a3a',flexShrink:0,
                  display:'flex',alignItems:'flex-end'}}>
                  <div style={{width:'100%',height:`${life*100}%`,
                    background:life<.25?'#ff3344':life<.5?'#ffaa00':'#2a6a8a',
                    transition:'height .2s'}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{fontSize:9,color:'#1a3040',letterSpacing:2,padding:'4px 0',flexShrink:0}}>
        SYNAPPSSYS LABS · RISKFLOW
      </div>

      {phase==='stageClear'&&(
        <div style={{position:'fixed',inset:0,zIndex:50,background:'#02060c',display:'flex',flexDirection:'column',
          justifyContent:'center',alignItems:'center',textAlign:'center',padding:20,boxSizing:'border-box',overflowY:'auto'}}>
          <div style={{color:'#00ffb4',fontSize:20.9,fontWeight:900}}>{currentStage.stage===3?'NIVEL SUPERADO':'ETAPA COMPLETADA'}</div>
          <p>Nivel {currentStage.level} · Etapa {currentStage.stage}/3 · {currentStage.title}</p>
          <p style={{fontSize:12.35,color:'#8aa8bb',maxWidth:350,lineHeight:1.6}}>
            Conectaste al menos 3 correlaciones y contuviste sus amenazas.
            {currentStage.stage===1?' Ya reconoces señales de una misma entidad.':
              currentStage.stage===2?' Relacionaste más entidades y fuentes.':' Resolviste el caso con mayor volumen de señales.'}
          </p>
          <p style={{fontSize:11.4,color:'#ffcc00',maxWidth:350}}>
            {currentStage.stage===3?'El siguiente nivel conserva las tres etapas y aumenta un poco la velocidad.':
              currentStage.stage===1?'Sigue Relacionar: más entidades y una tercera fuente.':'Sigue Resolver: las mismas reglas, más volumen.'}
          </p>
          <button onClick={nextStage} style={{marginTop:14,padding:'14px 22px',fontFamily:'inherit',fontSize:13.3,
            background:'#062032',border:'1px solid #00ffb4',color:'#00ffb4',cursor:'pointer'}}>
            {currentStage.stage===3?'SIGUIENTE NIVEL':'SIGUIENTE ETAPA'}
          </button>
        </div>
      )}

      {/* ══ PANTALLA: PORTADA ══ */}
      {phase==='title'&&(
        <div style={{position:'fixed',inset:0,background:'#02060c',zIndex:50,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          gap:0,padding:'20.4px 17px',textAlign:'center',overflowY:'auto',boxSizing:'border-box'}}>
          <div style={{fontSize:10.45,color:'#3a5a72',letterSpacing:5,marginBottom:11.9}}>SYNAPPSSYS LABS</div>
          <div style={{fontSize:32.3,fontWeight:900,color:'#00b4ff',letterSpacing:2,
            textShadow:'0 0 22px #00b4ff,0 0 60px #0066aa',lineHeight:1}}>RiskFlow</div>
          <div style={{fontSize:16.15,fontWeight:900,color:'#00ffb4',letterSpacing:8,marginTop:5.1,
            textShadow:'0 0 16px #00ffb4'}}>TRIAGE</div>

          <div style={{width:44,height:1,background:'#0a3a5a',margin:'18.7px 0'}}/>

          <div style={{fontSize:10.5,color:'#8aa8bb',lineHeight:2,maxWidth:330}}>
            Un solo gesto en todo el juego: <b style={{color:'#00ffb4'}}>tocar</b>.
          </div>
          <div style={{fontSize:10,color:'#5a7a8a',lineHeight:2,maxWidth:330,marginTop:5.1}}>
            Abajo <b style={{color:'#00b4ff'}}>emparejas</b> · arriba <b style={{color:'#00b4ff'}}>contienes</b>
          </div>

          {/* regla visual */}
          <div style={{marginTop:18.7,display:'flex',alignItems:'center',gap:11.9,
            border:'1px solid #0a3a5a',padding:'11.9px 15.3px',background:'rgba(0,30,55,.3)'}}>
            <Glyph shape="triangle" color="#00b4ff" size={44}/>
            <span style={{fontSize:21,color:'#00ffb4',fontWeight:900}}>+</span>
            <Glyph shape="triangle" color="#00ffb4" size={44}/>
            <span style={{fontSize:17.76,color:'#3a5a72'}}>=</span>
            <Glyph shape="triangle" color="#ff3300" size={44}/>
          </div>
          <div style={{fontSize:10,color:'#8aa8bb',marginTop:8.5,lineHeight:1.7,maxWidth:320}}>
            <b style={{color:'#00ffb4'}}>Misma figura</b> = misma entidad<br/>
            <b style={{color:'#00ffb4'}}>Distinto color</b> = distinta fuente
          </div>

          <div style={{marginTop:23.8,display:'flex',flexDirection:'column',alignItems:'center',gap:6.8}}>
            <div style={{fontSize:10,color:'#3a5a72',letterSpacing:4}}>RITMO</div>
            <div style={{display:'flex',gap:5.95}}>
              {Object.values(PACES).map(p=>(
                <button key={p.key} onClick={()=>setPace(p.key)}
                  style={{padding:'7.65px 12.75px',fontSize:10.45,fontFamily:'inherit',letterSpacing:1,
                    background:pace===p.key?'rgba(0,255,180,.15)':'transparent',
                    border:`1px solid ${pace===p.key?'#00ffb4':'#26485a'}`,
                    color:pace===p.key?'#00ffb4':'#5a7a8a',cursor:'pointer',
                    WebkitTapHighlightColor:'transparent'}}>{p.label}</button>
              ))}
            </div>
          </div>

          <button onClick={startTutorial} className="bl"
            style={{marginTop:25.5,padding:'11.9px 34px',fontSize:12.11,fontFamily:'inherit',
              background:'transparent',border:'2px solid #00ffb4',color:'#00ffb4',letterSpacing:3,
              cursor:'pointer',textShadow:'0 0 10px #00ffb4',boxShadow:'0 0 18px rgba(0,255,180,.25)',
              WebkitTapHighlightColor:'transparent'}}>CÓMO SE JUEGA</button>
          <button onClick={startReal}
            style={{marginTop:11.9,padding:'6.8px 15.3px',fontSize:10.45,fontFamily:'inherit',
              background:'transparent',border:'none',color:'#3a5a72',letterSpacing:1,
              textDecoration:'underline',cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
            saltar tutorial
          </button>
          {embedded&&<a className="mobile-launch" href="https://registro.synappssys.com/RiskFlow_Triage.html" target="_top">ABRIR JUEGO SIN MARCO DEL PORTAL</a>}
          {!embedded&&<a href="https://www.synappssys.com/reto-triage" style={{marginTop:10,color:'#8aa8bb',fontSize:10}}>Volver al portal</a>}
          <div style={{fontSize:10,color:'#8aa8bb',maxWidth:330,marginTop:10,lineHeight:1.4}}>Simulación educativa: conectar fuentes genera hipótesis, no confirma un ataque.</div>
          {hs>0&&<div style={{marginTop:17,fontSize:10.45,color:'#ffcc00',letterSpacing:2}}>RÉCORD · {hs}</div>}
        </div>
      )}

      {/* ══ PANTALLA: REPORTE KPI ══ */}
      {phase==='over'&&(() => {
        const st=stats;
        const donut=[
          {k:'Consumidos en correlaciones',v:st.evCorr,c:'#00e8a5'},
          {k:'Eventos sin pareja al caducar',v:st.evNoise,c:'#7b8a99'},
          {k:'Caducaron con pareja disponible',v:st.evBreach,c:'#ff3344'},
          {k:'Perdidos por saturación',v:st.evOver,c:'#ff9500'},
          {k:'Cerrados al completar etapas',v:st.evStageCleared,c:'#00b4ff'},
        ];
        const dTotal=donut.reduce((a,b)=>a+b.v,0);
        const pend=Math.max(0,st.evTotal-dTotal);
        const dd=pend>0?[...donut,{k:'Aún en cola al terminar',v:pend,c:'#3a5fe0'}]:donut;
        const gran=dd.reduce((a,b)=>a+b.v,0)||1;
        const mttd=avg(st.mttd), mttr=avg(st.mttr);
        const detTotal=st.saldados;
        const cobertura=st.evTotal>0?Math.round(st.evCorr/st.evTotal*100):0;
        const eficacia=detTotal>0?Math.round(st.contenidos/detTotal*100):0;
        const precision=(detTotal+st.fp)>0?Math.round(detTotal/(detTotal+st.fp)*100):100;
        const KPI=({label,val,unit,color,hint})=>(
          <div style={{flex:'1 1 44%',minWidth:130,border:'1px solid #0a2c44',
            padding:'11px 12px',background:'rgba(0,25,45,.35)'}}>
            <div style={{fontSize:9,color:'#5a7a8a',letterSpacing:1.5}}>{label}</div>
            <div style={{fontSize:20.19,fontWeight:900,color,lineHeight:1.25,fontFamily:'monospace'}}>
              {val}<span style={{fontSize:10,marginLeft:2,color:'#4a6a7a'}}>{unit}</span>
            </div>
            {hint&&<div style={{fontSize:8,color:'#3a5a72',lineHeight:1.4}}>{hint}</div>}
          </div>
        );
        return (
          <div style={{position:'fixed',inset:0,background:'#02060c',zIndex:50,
            overflowY:'auto',padding:'26px 16px 40px',boxSizing:'border-box'}}>
            <div style={{maxWidth:400,margin:'0 auto'}}>

              <div style={{textAlign:'center'}}>
                <div style={{fontSize:9,color:'#3a5a72',letterSpacing:5}}>SYNAPPSSYS LABS · RISKFLOW</div>
                <div style={{fontSize:15.34,fontWeight:900,color:'#00b4ff',letterSpacing:2,marginTop:8,
                  textShadow:'0 0 16px #00b4ff'}}>REPORTE DE DESEMPEÑO</div>
                <div style={{fontSize:10,color:'#5a7a8a',letterSpacing:2,marginTop:3}}>
                  OPERADOR DE TRIAGE · NIVEL {currentStage.level} · ETAPA {currentStage.stage}/3 · {PACES[pace].label}
                </div>
                <div style={{fontSize:27.46,fontWeight:900,color:'#00ffb4',marginTop:14,
                  textShadow:'0 0 18px #00ffb4',fontFamily:'monospace'}}>{score}</div>
                <div style={{fontSize:9,color:'#3a5a72',letterSpacing:3}}>PUNTOS</div>
                {score>=hs&&score>0&&
                  <div style={{fontSize:10.45,color:'#ffcc00',letterSpacing:2,marginTop:6}}>★ NUEVO RÉCORD ★</div>}
              </div>

              {/* DONA */}
              <div style={{marginTop:26,border:'1px solid #0a2c44',padding:'14px 12px',
                background:'rgba(0,20,38,.3)'}}>
                <div style={{fontSize:10,color:'#00b4ff',letterSpacing:2,marginBottom:8}}>
                  ◈ DISPOSICIÓN DEL VOLUMEN DE EVENTOS
                </div>
                <div style={{display:'flex',justifyContent:'center'}}>
                  <Donut data={dd} total={st.evTotal}/>
                </div>
                <div style={{marginTop:12}}>
                  {dd.map(d=>(
                    <div key={d.k} style={{display:'flex',alignItems:'center',gap:8,
                      padding:'4px 0',borderBottom:'1px solid #08202f'}}>
                      <span style={{width:11,height:11,background:d.c,flexShrink:0,borderRadius:2}}/>
                      <span style={{flex:1,fontSize:10.45,color:'#8aa8bb'}}>{d.k}</span>
                      <b style={{fontSize:10,color:d.c,fontFamily:'monospace'}}>{d.v}</b>
                      <span style={{fontSize:10,color:'#3a5a72',width:40,textAlign:'right',
                        fontFamily:'monospace'}}>{Math.round(d.v/gran*100)}%</span>
                    </div>
                  ))}
                </div>

                {/* desglose de correlaciones */}
                {st.saldados>0&&(
                  <div style={{marginTop:12,padding:'10px 11px',background:'rgba(0,40,70,.3)',
                    border:'1px solid #0a2c44'}}>
                    <div style={{fontSize:9,color:'#5a7a8a',letterSpacing:1.5,marginBottom:6}}>
                      DESGLOSE DE LOS {st.evCorr} EVENTOS CORRELACIONADOS
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,
                      padding:'3px 0',borderBottom:'1px solid #08202f'}}>
                      <span style={{color:'#8aa8bb'}}>Correlaciones dobles (2 fuentes)</span>
                      <b style={{color:'#00e8a5',fontFamily:'monospace'}}>{st.saldados-(st.apt||0)}</b>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'3px 0'}}>
                      <span style={{color:'#cc00ff'}}>Correlaciones triples (3 fuentes)</span>
                      <b style={{color:'#cc00ff',fontFamily:'monospace'}}>{st.apt||0}</b>
                    </div>
                    <div style={{fontSize:9,color:'#3a5a72',marginTop:6,lineHeight:1.5}}>
                      cada correlación doble consume 2 eventos · cada correlación triple consume 3
                    </div>
                  </div>
                )}
              </div>

              {/* LÍNEA DE TIEMPO */}
              <div style={{marginTop:14,border:'1px solid #0a2c44',padding:'14px 10px',
                background:'rgba(0,20,38,.3)'}}>
                <div style={{fontSize:10,color:'#00b4ff',letterSpacing:2,marginBottom:6,paddingLeft:2}}>
                  ◈ DETECCIÓN vs MITIGACIÓN EN EL TIEMPO
                </div>
                {st.timeline.length>1
                  ? <Timeline tl={st.timeline}/>
                  : <div style={{fontSize:10,color:'#3a5a72',textAlign:'center',padding:26}}>
                      turno demasiado corto para graficar
                    </div>}
              </div>

              {/* KPIs */}
              <div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:8}}>
                <KPI label="MTTD" val={mttd?mttd.toFixed(1):'—'} unit="s" color="#00b4ff"
                  hint="del primer indicio a la correlación"/>
                <KPI label="MTTR" val={mttr?mttr.toFixed(1):'—'} unit="s" color="#00ffb4"
                  hint="de la detección a la contención"/>
                <KPI label="COBERTURA" val={cobertura} unit="%" color="#00b4ff"
                  hint="eventos aprovechados del total"/>
                <KPI label="EFICACIA" val={eficacia} unit="%" color="#00ffb4"
                  hint="detectadas que sí contuviste"/>
                <KPI label="PRECISIÓN" val={precision} unit="%" color="#ffcc00"
                  hint="aciertos sobre intentos"/>
                <KPI label="RACHA MÁX" val={bestComboR.current} unit="×" color="#cc00ff"
                  hint="correlaciones seguidas sin fallar"/>
              </div>

              {/* DETALLE */}
              <div style={{marginTop:14,border:'1px solid #0a2c44',padding:'12px 14px',
                background:'rgba(0,20,38,.3)',fontSize:10,lineHeight:2}}>
                {[
                  ['Correlaciones realizadas',st.saldados,'#00ffb4'],
                  ['Amenazas contenidas',st.contenidos,'#00ffb4'],
                  ['Correlaciones triples',st.apt||0,'#cc00ff'],
                  ['Impactos en activos',st.brechas,'#ff4455'],
                  ['Correlaciones incorrectas',st.fp,'#ffcc00'],
                ].map(([k,v,c])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',
                    borderBottom:'1px solid #08202f'}}>
                    <span style={{color:'#7799aa'}}>{k}</span>
                    <b style={{color:c,fontFamily:'monospace'}}>{v}</b>
                  </div>
                ))}
              </div>

              {/* LECTURA */}
              {pend>=QUEUE_MAX&&(
                <div style={{marginTop:14,border:'1px solid #1a2c6a',
                  background:'rgba(20,30,90,.28)',padding:'12px 14px'}}>
                  <div style={{fontSize:10,color:'#6a8aff',letterSpacing:2,marginBottom:5}}>◈ CIERRE EN SATURACIÓN</div>
                  <div style={{fontSize:10.45,color:'#a8b8dd',lineHeight:1.75}}>
                    Terminaste con la cola llena ({pend} de {QUEUE_MAX}).
                    El volumen superó la capacidad de esta partida para conectar señales.
                    La correlación automática puede ayudar a reducir ese trabajo;
                    el resultado depende de las fuentes y reglas integradas.
                  </div>
                </div>
              )}

              {st.brechas>0&&(
                <div style={{marginTop:14,border:'1px solid #3a1420',
                  background:'rgba(60,10,22,.3)',padding:'12px 14px'}}>
                  <div style={{fontSize:10,color:'#ff4455',letterSpacing:2,marginBottom:5}}>◈ LECTURA</div>
                  <div style={{fontSize:10.45,color:'#c9a0a8',lineHeight:1.75}}>
                    {st.brechas} amenaza{st.brechas>1?'s':''} llegó a tus activos.
                    Los indicios estaban en tu cola — expiraron sin correlacionar.
                    En este ejercicio, conectar las señales antes de que caduquen
                    permite actuar a tiempo. Estos tiempos corresponden a la simulación.
                  </div>
                </div>
              )}

              <div style={{display:'flex',gap:7,justifyContent:'center',marginTop:20}}>
                {Object.values(PACES).map(p=>(
                  <button key={p.key} onClick={()=>setPace(p.key)}
                    style={{padding:'8px 13px',fontSize:10,fontFamily:'inherit',letterSpacing:1,
                      background:pace===p.key?'rgba(0,255,180,.15)':'transparent',
                      border:`1px solid ${pace===p.key?'#00ffb4':'#26485a'}`,
                      color:pace===p.key?'#00ffb4':'#5a7a8a',cursor:'pointer',
                      WebkitTapHighlightColor:'transparent'}}>{p.label}</button>
                ))}
              </div>

              <div style={{textAlign:'center'}}>
                <button onClick={startReal}
                  style={{marginTop:16,padding:'13px 36px',fontSize:11.31,fontFamily:'inherit',
                    background:'transparent',border:'2px solid #00b4ff',color:'#00b4ff',letterSpacing:3,
                    cursor:'pointer',boxShadow:'0 0 16px rgba(0,180,255,.22)',
                    WebkitTapHighlightColor:'transparent'}}>NUEVO TURNO</button>
                <div>
                  <button onClick={()=>setPhase('title')}
                    style={{marginTop:12,padding:'6px 14px',fontSize:10.45,fontFamily:'inherit',
                      background:'transparent',border:'none',color:'#3a5a72',letterSpacing:1,
                      textDecoration:'underline',cursor:'pointer',
                      WebkitTapHighlightColor:'transparent'}}>portada</button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}

