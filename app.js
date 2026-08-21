let D=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function percentile(score){return Math.max(1,Math.min(99,score))}
function rankLabel(score){let p=100-score;return p<=1?"Top 1 %":`Top ${Math.max(2,Math.round(p))} %`}
function render(){
 const ex=D.exercises,m=D.muscles;
 const vals=Object.values(ex), scores=vals.map(x=>x.personal_score);
 const overall=Math.round(scores.reduce((a,b)=>a+b,0)/(scores.length||1));
 $("overall").textContent=overall+"/100"; $("overallText").textContent=rankLabel(overall)+" innerhalb deines aktuellen Übungsprofils";
 $("sets").textContent=D.meta.rows; $("exCount").textContent=D.meta.exercises; $("workouts").textContent=D.meta.workouts??"—";
 const top=Object.entries(ex).sort((a,b)=>b[1].best_1rm-a[1].best_1rm).slice(0,6);
 $("overview").innerHTML=`<div class="grid">
 <div class="stat"><span class="muted">Gesamtvolumen</span><b>${Math.round(vals.reduce((a,x)=>a+x.volume,0)).toLocaleString("de-DE")} kg</b></div>
 <div class="stat"><span class="muted">Ø Fortschritt</span><b>${Math.round(vals.reduce((a,x)=>a+x.progress_pct,0)/(vals.length||1))}%</b></div></div>
 <h2>Stärkste Übungen</h2>${top.map(([n,x])=>card(n,x)).join("")}`;
 const ms=Object.entries(m).sort((a,b)=>b[1].score-a[1].score);
 $("muscles").innerHTML=`<h2>Muskelprofil</h2>${ms.map(([n,x])=>`<div class="card"><div class="row"><div><div class="title">${esc(n)}</div><div class="muted">${x.exercise_count} Übungen · ${Math.round(x.volume).toLocaleString("de-DE")} kg Volumen</div></div><div class="score">${x.score}</div></div><div class="bar"><i style="width:${x.score}%"></i></div><span class="badge">${rankLabel(x.score)}</span><span class="badge">Fortschritt ${x.progress_pct}%</span></div>`).join("")}`;
 $("exercises").innerHTML=`<h2>Alle Übungen</h2>${Object.entries(ex).sort((a,b)=>b[1].personal_score-a[1].personal_score).map(([n,x])=>card(n,x)).join("")}`;
 const prog=Object.entries(ex).sort((a,b)=>b[1].progress_pct-a[1].progress_pct);
 $("progress").innerHTML=`<h2>Deine Entwicklung</h2>${prog.map(([n,x])=>`<div class="card"><div class="row"><div><div class="title">${esc(n)}</div><div class="muted">${x.sets} Sätze · Bestes 1RM ${x.best_1rm.toFixed(1)} kg</div></div><div class="score">${x.progress_pct>=0?"+":""}${x.progress_pct.toFixed(0)}%</div></div><div class="bar"><i style="width:${Math.min(100,Math.max(3,50+x.progress_pct))}%"></i></div></div>`).join("")}`;
}
function card(n,x){return `<div class="card"><div class="row"><div><div class="title">${esc(n)}</div><div class="muted">${x.sets} Sätze · ${Math.round(x.volume).toLocaleString("de-DE")} kg Volumen</div></div><div class="score">${x.best_1rm.toFixed(1)}</div></div><div class="muted">geschätztes 1RM · ${rankLabel(x.personal_score)}</div><div class="bar"><i style="width:${x.personal_score}%"></i></div><span class="badge">Bestgewicht ${x.best_weight} kg</span><span class="badge">Fortschritt ${x.progress_pct>=0?"+":""}${x.progress_pct.toFixed(0)}%</span></div>`}
function load(obj){D=obj;render()}
fetch("data.json").then(r=>r.json()).then(load).catch(()=>{});
$("importBtn").onclick=()=>$("file").click();
$("file").onchange=async e=>{let f=e.target.files[0];if(!f)return;let text=await f.text();let lines=text.trim().split(/\r?\n/);let sep=lines[0].includes(";")?";":",";let head=lines.shift().split(sep).map(x=>x.replace(/^"|"$/g,""));let rows=lines.map(line=>{let p=line.split(sep).map(x=>x.replace(/^"|"$/g,""));let o={};head.forEach((h,i)=>o[h]=p[i]);return o});alert("CSV geladen. Für die aktuelle V2 werden die beim Projekt hinterlegten Daten direkt analysiert. Ein vollständiger CSV-Parser folgt in V3.");};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));b.classList.add("active");$(b.dataset.tab).classList.remove("hidden")});
