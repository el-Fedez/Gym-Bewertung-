let D=null;

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s??"").toLowerCase().trim().replace(/[_-]+/g," ").replace(/\s+/g," ");
function findCol(headers, names){
  const h=headers.map(norm);
  for(const n of names){const i=h.indexOf(norm(n)); if(i>=0)return headers[i]}
  return null;
}
function parseCSV(text){
  const lines=[]; let row=[], cell="", q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c=='"'){ if(q&&n=='"'){cell+='"';i++} else q=!q; }
    else if(c==','&&!q){row.push(cell);cell=""}
    else if(c==';'&&!q){row.push(cell);cell=""}
    else if((c=="\n"||c=="\r")&&!q){
      if(c=="\r"&&n=="\n")i++;
      row.push(cell);cell="";
      if(row.some(x=>x!==""))lines.push(row);
      row=[];
    } else cell+=c;
  }
  if(cell||row.length){row.push(cell);if(row.some(x=>x!==""))lines.push(row)}
  const headers=lines.shift()||[];
  return lines.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
function num(v){
  if(v==null||v==="")return 0;
  let s=String(v).replace(/[^\d,.-]/g,"");
  if(s.includes(",")&&!s.includes("."))s=s.replace(",",".");
  else s=s.replace(/,/g,"");
  const x=parseFloat(s); return Number.isFinite(x)?x:0;
}
function e1rm(w,r){return w>0&&r>0?w*(1+Math.min(r,12)/30):0}
const muscleMap={
  Brust:["bench press","incline bench","decline bench","chest press","chest fly","pec deck","butterfly","cable fly","dumbbell fly"],
  Rücken:["pull up","pull-up","chin up","lat pulldown","pulldown","seated row","cable row","barbell row","dumbbell row","t-bar","row","deadlift","back extension"],
  Schulter:["overhead press","shoulder press","military press","lateral raise","side raise","front raise","rear delt","face pull","reverse fly"],
  Bizeps:["bicep curl","barbell curl","dumbbell curl","hammer curl","preacher curl","incline curl","cable curl"],
  Trizeps:["tricep","triceps","skull crusher","pushdown","push down","close grip bench","overhead extension"],
  Quadrizeps:["squat","leg press","hack squat","leg extension","split squat","lunge","bulgarian"],
  Beinbeuger:["leg curl","hamstring","romanian deadlift","rdl","good morning"],
  Gesäß:["hip thrust","glute","deadlift","squat","lunge","split squat","abduction"],
  Waden:["calf raise","standing calf","seated calf"],
  Core:["crunch","sit up","plank","ab wheel","leg raise","hanging leg"]
};
function hits(name){
  const s=norm(name), a=[];
  for(const [m,keys] of Object.entries(muscleMap))if(keys.some(k=>s.includes(norm(k))))a.push(m);
  return a.length?a:["Sonstige"];
}
function build(rows, headers){
  const exCol=findCol(headers,["exercise_title","exercise","exercise name"]);
  const wCol=findCol(headers,["weight_kg","weight","weight (kg)"]);
  const rCol=findCol(headers,["reps","repetitions"]);
  const dCol=findCol(headers,["start_time","date","workout_date"]);
  const woCol=findCol(headers,["workout_name","workout"]);
  const data=rows.map(x=>({exercise:x[exCol]||"Unbekannt",weight:num(x[wCol]),reps:Math.round(num(x[rCol])),date:x[dCol]||"",workout:x[woCol]||""}));
  const exercises={};
  for(const x of data){
    const e=exercises[x.exercise]??={sets:0,volume:0,best_weight:0,best_1rm:0,reps:0,vals:[]};
    e.sets++;e.volume+=x.weight*x.reps;e.reps+=x.reps;e.best_weight=Math.max(e.best_weight,x.weight);
    const one=e1rm(x.weight,x.reps);e.best_1rm=Math.max(e.best_1rm,one);if(one)e.vals.push(one);
  }
  const max=Math.max(...Object.values(exercises).map(x=>x.best_1rm),1);
  for(const [name,e] of Object.entries(exercises)){
    const n=e.vals.length, k=Math.max(1,Math.floor(n/3));
    e.progress_pct=n>=4?((e.vals.slice(-k).reduce((a,b)=>a+b,0)/k)/(e.vals.slice(0,k).reduce((a,b)=>a+b,0)/k)-1)*100:0;
    e.personal_score=100*e.best_1rm/max;
    e.muscles=hits(name);
  }
  const muscles={};
  for(const [name,e] of Object.entries(exercises))for(const m of e.muscles){
    const a=muscles[m]??={exercise_count:0,volume:0,best_sum:0,progress:[],exercises:[]};
    a.exercise_count++;a.volume+=e.volume;a.best_sum+=e.best_1rm;a.progress.push(e.progress_pct);a.exercises.push(name);
  }
  const mm=Math.max(...Object.values(muscles).map(x=>x.best_sum),1);
  for(const a of Object.values(muscles)){a.score=100*a.best_sum/mm;a.progress_pct=a.progress.length?a.progress.reduce((x,y)=>x+y,0)/a.progress.length:0}
  return {data,exercises,muscles,meta:{rows:data.length,exercises:Object.keys(exercises).length,workouts:new Set(data.map(x=>x.workout).filter(Boolean)).size}};
}
function rankLabel(score){const p=100-score;return p<=1?"Top 1 %":`Top ${Math.max(2,Math.round(p))} %`}
function card(n,x){return `<div class="card"><div class="row"><div><div class="title">${esc(n)}</div><div class="muted">${x.sets} Sätze · ${Math.round(x.volume).toLocaleString("de-DE")} kg Volumen</div></div><div class="score">${x.best_1rm.toFixed(1)}</div></div><div class="muted">geschätztes 1RM · ${rankLabel(x.personal_score)}</div><div class="bar"><i style="width:${x.personal_score}%"></i></div><span class="badge">Bestgewicht ${x.best_weight} kg</span><span class="badge">Fortschritt ${x.progress_pct>=0?"+":""}${x.progress_pct.toFixed(0)}%</span></div>`}
function render(){
 const vals=Object.values(D.exercises), overall=Math.round(vals.reduce((a,x)=>a+x.personal_score,0)/(vals.length||1));
 $("overall").textContent=overall+"/100";$("overallText").textContent="Persönliches Strength Profile · "+rankLabel(overall);
 $("sets").textContent=D.meta.rows;$("exCount").textContent=D.meta.exercises;$("workouts").textContent=D.meta.workouts||"—";
 const top=Object.entries(D.exercises).sort((a,b)=>b[1].best_1rm-a[1].best_1rm).slice(0,6);
 $("overview").innerHTML=`<div class="grid"><div class="stat"><span class="muted">Gesamtvolumen</span><b>${Math.round(vals.reduce((a,x)=>a+x.volume,0)).toLocaleString("de-DE")} kg</b></div><div class="stat"><span class="muted">Ø Fortschritt</span><b>${Math.round(vals.reduce((a,x)=>a+x.progress_pct,0)/(vals.length||1))}%</b></div></div><h2>Stärkste Übungen</h2>${top.map(([n,x])=>card(n,x)).join("")}`;
 const ms=Object.entries(D.muscles).sort((a,b)=>b[1].score-a[1].score);
 $("muscles").innerHTML=`<h2>Muskelprofil</h2>${ms.map(([n,x])=>`<div class="card"><div class="row"><div><div class="title">${esc(n)}</div><div class="muted">${x.exercise_count} Übungen · ${Math.round(x.volume).toLocaleString("de-DE")} kg Volumen</div></div><div class="score">${x.score.toFixed(0)}</div></div><div class="bar"><i style="width:${x.score}%"></i></div><span class="badge">${rankLabel(x.score)}</span><span class="badge">Fortschritt ${x.progress_pct>=0?"+":""}${x.progress_pct.toFixed(0)}%</span></div>`).join("")}`;
 $("exercises").innerHTML=`<h2>Alle Übungen</h2>${Object.entries(D.exercises).sort((a,b)=>b[1].personal_score-a[1].personal_score).map(([n,x])=>card(n,x)).join("")}`;
 const p=Object.entries(D.exercises).sort((a,b)=>b[1].progress_pct-a[1].progress_pct);
 $("progress").innerHTML=`<h2>Fortschritt</h2>${p.map(([n,x])=>`<div class="card"><div class="row"><div><div class="title">${esc(n)}</div><div class="muted">Bestes 1RM ${x.best_1rm.toFixed(1)} kg</div></div><div class="score">${x.progress_pct>=0?"+":""}${x.progress_pct.toFixed(0)}%</div></div><div class="bar"><i style="width:${Math.min(100,Math.max(3,50+x.progress_pct))}%"></i></div></div>`).join("")}`;
}
$("importBtn").onclick=()=>$("file").click();
$("file").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const text=await f.text(), rows=parseCSV(text), headers=rows.length?Object.keys(rows[0]):[];if(!headers.length)throw Error("Keine CSV-Daten gefunden.");D=build(rows,headers);render();$("sub").textContent=`${f.name} · lokal analysiert`;localStorage.removeItem("gymRankingData");}catch(err){alert("CSV konnte nicht verarbeitet werden: "+err.message)}};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));b.classList.add("active");$(b.dataset.tab).classList.remove("hidden")});
