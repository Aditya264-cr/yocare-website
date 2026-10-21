(() => {
  "use strict";
  const STORAGE_KEY="yocare.health.vault.v1";
  const HEURISTICS={
    WYSIATI:"WYSIATI · limited information",
    AFFECT_HEURISTIC:"Affect heuristic · feeling as evidence",
    AVAILABILITY_CASCADE:"Availability · vivid recent example",
    ANCHORING:"Anchoring · first number or detail"
  };
  const byId=id=>document.getElementById(id);
  const vaultSection=byId("privacy"),vaultForm=byId("vault-form"),workspace=byId("health-workspace");
  const vaultMessage=byId("vault-message"),passphrase=byId("vault-passphrase"),confirmPassphrase=byId("vault-confirm"),usernameInput=byId("vault-username");
  const lockButton=byId("lock-button");
  let vaultKey=null,vaultSalt=null,data=null,pendingLog=null,resetTimer=null,sleepTimer=null,sleepRemaining=0,sleepDuration=0,sleepStarted=0,sleepPhrase=null,sleepLocked=false;
  const emptyData=()=>({logs:[],interventions:[],checkins:[],episodes:[],days:{},watchmanEntries:[],phrases:[],sleepSessions:[],releaseChecks:[]});
  const normalizeData=value=>{value.watchmanEntries??=[];value.phrases??=[];value.sleepSessions??=[];value.releaseChecks??=[];return value;};
  const normalizeUsername=value=>String(value??"").trim().toLocaleLowerCase();
  const textEncoder=new TextEncoder(),textDecoder=new TextDecoder();
  const toBase64=bytes=>{
    let binary="";
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary);
  };
  const fromBase64=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
  const deriveKey=async(secret,salt)=>{
    const material=await crypto.subtle.importKey("raw",textEncoder.encode(secret),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  };
  const readEnvelope=()=>{
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");}
    catch{return null;}
  };
  const encryptData=async(value,key,salt)=>{
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,textEncoder.encode(JSON.stringify(value)));
    localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,salt:toBase64(salt),iv:toBase64(iv),cipher:toBase64(new Uint8Array(cipher))}));
  };
  const decryptData=async(envelope,secret)=>{
    const salt=fromBase64(envelope.salt);
    const key=await deriveKey(secret,salt);
    const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(envelope.iv)},key,fromBase64(envelope.cipher));
    return {key,salt,value:JSON.parse(textDecoder.decode(plain))};
  };
  const todayKey=()=>{
    const now=new Date();
    return [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
  };
  const localTime=timestamp=>new Date(timestamp).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  const localDateTime=timestamp=>new Date(timestamp).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  const escapeText=value=>String(value??"");
  const setMessage=(element,message,isError=false)=>{
    element.textContent=message;
    element.classList.toggle("is-error",isError);
  };
  const setVaultMode=()=>{
    const existing=readEnvelope();
    byId("vault-title").textContent=existing?"Welcome back to your private space.":"Your reflections stay on this device.";
    byId("vault-description").textContent=existing
      ?"Unlock your encrypted local vault with the passphrase you created. Your entries are never sent to Yocare."
      :"Create a private vault with a passphrase. Your entries are encrypted in this browser and are never sent to Yocare.";
    byId("username-label").textContent=existing?"Username":"Choose a username";
    usernameInput.autocomplete="username";
    byId("passphrase-label").textContent=existing?"Passphrase":"Create a passphrase";
    passphrase.autocomplete=existing?"current-password":"new-password";
    confirmPassphrase.hidden=Boolean(existing);
    confirmPassphrase.required=!existing;
    byId("confirm-label").hidden=Boolean(existing);
    byId("vault-submit").innerHTML=existing?'Unlock my vault <span>↗</span>':'Create private vault <span>↗</span>';
    passphrase.minLength=existing?1:12;
    vaultMessage.textContent="";
    const supported=Boolean(window.isSecureContext&&window.crypto&&window.crypto.subtle);
    if(!supported){
      byId("vault-submit").disabled=true;
      setMessage(vaultMessage,"Private storage needs a secure connection (HTTPS) and a browser with Web Crypto.",true);
    }else byId("vault-submit").disabled=false;
  };
  const unlock=()=>{
    vaultSection.hidden=true;
    workspace.hidden=false;
    lockButton.hidden=false;
    render();
    byId("state-label").textContent="Ready to reflect";
    byId("state-detail").textContent="Your check-in is private to this device.";
    workspace.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
  };
  const lock=()=>{
    if(resetTimer)clearInterval(resetTimer);
    resetTimer=null;stopSleep(false);pendingLog=null;data=null;vaultKey=null;vaultSalt=null;
    workspace.hidden=true;vaultSection.hidden=false;lockButton.hidden=true;
    document.querySelectorAll(".health-workspace form").forEach(form=>form.reset());
    byId("reframe-card").hidden=true;byId("reset-card").hidden=true;
    byId("reset-breath").classList.remove("is-active");
    byId("breath-instruction").textContent="Let your shoulders soften. Take one comfortable breath.";
    usernameInput.value="";passphrase.value="";confirmPassphrase.value="";
    setVaultMode();
    window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  };
  const commit=async(mutator)=>{
    if(!data||!vaultKey||!vaultSalt)throw new Error("Unlock your vault before saving.");
    const next=JSON.parse(JSON.stringify(data));
    mutator(next);
    await encryptData(next,vaultKey,vaultSalt);
    data=next;
    render();
  };
  const makeEntry=(title,detail)=>{
    const li=document.createElement("li");
    const left=document.createElement("span"),right=document.createElement("span");
    left.textContent=escapeText(title);right.textContent=escapeText(detail);
    li.append(left,right);
    return li;
  };
  const emptyRow=list=>{const li=document.createElement("li");li.className="entry-empty";li.textContent="Nothing saved here yet.";list.replaceChildren(li);};
  const countInterventionsToday=()=>{
    if(!data)return 0;
    return data.interventions.filter(item=>new Date(item.timestamp).toDateString()===new Date().toDateString()).length;
  };
  const renderLogs=()=>{
    const list=byId("log-list"),logs=data.logs.filter(log=>new Date(log.timestamp).toDateString()===new Date().toDateString()).slice(0,3);
    list.replaceChildren();
    if(!logs.length){emptyRow(list);return;}
    logs.forEach(log=>{
      const status=log.status==="RESOLVED"?"reframed":log.status==="BYPASSED_DUE_TO_DEPLETION"?"saved to pause":"saved for later";
      const label=HEURISTICS[log.detectedHeuristic]||"Automatic impression";
      list.append(makeEntry(log.initialAssumption||log.triggerText,localTime(log.timestamp)+" · "+status));
      list.lastChild.title=label;
    });
  };
  const renderCheckins=()=>{
    const list=byId("checkin-list"),items=data.checkins.filter(item=>new Date(item.timestamp).toDateString()===new Date().toDateString()).slice(0,4);
    list.replaceChildren();
    if(!items.length){emptyRow(list);return;}
    items.forEach(item=>list.append(makeEntry("Calm "+item.calm+" · Anxiety "+item.anxiety+" · Focus "+item.focus,localTime(item.timestamp))));
  };
  const calcDuration=episode=>episode.durationMinutes;
  const renderEpisodes=()=>{
    const key=todayKey(),episodes=data.episodes.filter(item=>item.day===key);
    const list=byId("episode-list");
    list.replaceChildren();
    if(!episodes.length)emptyRow(list);
    else episodes.slice().reverse().forEach(item=>list.append(makeEntry(item.activityName,localTime(item.startTimestamp)+"–"+localTime(item.endTimestamp)+" · "+item.durationMinutes+" min")));
    const total=episodes.reduce((sum,item)=>sum+calcDuration(item),0);
    const weightedHappiness=total?episodes.reduce((sum,item)=>sum+item.experiencingAffect.happiness*item.durationMinutes,0)/total:null;
    const difficult=total?episodes.filter(item=>{
      const affect=item.experiencingAffect;
      return affect.stress>affect.calm||affect.happiness<=2;
    }).reduce((sum,item)=>sum+item.durationMinutes,0)/total*100:null;
    const review=data.days[key]?.retrospective;
    const summary=byId("day-summary");
    summary.replaceChildren();
    summary.append(metricCard("Remembered overall",review===undefined?"—":Number(review).toFixed(1)+"/6","Your end-of-day recollection"));
    summary.append(metricCard("Scene-weighted happiness",weightedHappiness===null?"—":weightedHappiness.toFixed(1)+"/6",total?total+" reconstructed minutes":"Add a scene to compare"));
    summary.append(metricCard("Difficult-scene time",difficult===null?"—":Math.round(difficult)+"%","Based on the scenes you entered"));
    const method=document.createElement("p");
    method.className="day-method";
    method.textContent="Scene-weighted happiness = Σ(happiness × minutes) ÷ reconstructed minutes. Difficult-scene time counts minutes where stress was higher than calm or happiness was 0–2. These are reflection aids, not clinical scores.";
    summary.append(method);
  };
  const metricCard=(label,value,detail)=>{
    const card=document.createElement("div");card.className="day-metric";
    const title=document.createElement("span"),number=document.createElement("strong"),note=document.createElement("span");
    title.textContent=label;number.textContent=value;note.textContent=detail;
    card.append(title,number,note);return card;
  };
    const renderPillarTwo=()=>{
    const fill=(id,items,make)=>{
      const list=byId(id);if(!list)return;list.replaceChildren();
      const recent=(items||[]).slice(0,4);if(!recent.length){emptyRow(list);return;}
      recent.forEach(item=>list.append(make(item)));
    };
    renderWatchman();renderPhrases();renderSleepHistory();renderRelease();
  };
  const renderWatchman=()=>renderList("watchman-list",data.watchmanEntries,(item)=>makeEntry(item.thought,localDateTime(item.timestamp)));
  const renderPhrases=()=>{
    const items=data.phrases||[],select=byId("sleep-phrase");
    select.replaceChildren();
    if(!items.length){const opt=document.createElement("option");opt.value="";opt.textContent="Save a phrase first";select.append(opt);select.disabled=true;}
    else {select.disabled=false;items.forEach(item=>{const opt=document.createElement("option");opt.value=item.id;opt.textContent=item.text;select.append(opt);});}
    renderList("phrase-list",items,item=>makeEntry(item.text,item.category));
  };
  const renderSleepHistory=()=>renderList("sleep-list",data.sleepSessions,item=>makeEntry(item.phraseText,item.durationSeconds+" sec · "+localDateTime(item.timestamp)));
  const renderRelease=()=>renderList("release-list",data.releaseChecks,item=>makeEntry(item.eventLabel,(item.score>=8?"Feels neutral today":item.score<=4?"Revisit when ready":"Saved for later")+" · "+localDateTime(item.timestamp)));
  const renderList=(id,items,make)=>{
    const list=byId(id);if(!list)return;list.replaceChildren();
    if(!items||!items.length){emptyRow(list);return;}
    items.slice(0,4).forEach(item=>list.append(make(item)));
  };
  const thoughtReply=value=>{
    const lower=value.toLocaleLowerCase();
    if(/\b(always|never|everyone|no one|nothing|everything|ruined|hopeless|worthless|can't|cannot|will fail)\b/.test(lower))
      return "That sounds like a painful, all-or-nothing prediction. It may help to ask what you know for sure, and what is still uncertain.";
    if(/\b(danger|unsafe|hurt|harm|threat)\b/.test(lower))
      return "Your safety matters. If there may be immediate danger, focus on getting to a safer place or contacting someone you trust. You do not need to reframe a real safety concern.";
    return "Your mind may be trying to protect you. We can pause before treating the thought as a fact.";
  };
  const stopSleep=async(completed=false)=>{
    if(sleepTimer){clearInterval(sleepTimer);sleepTimer=null;}
    const overlay=byId("sleep-overlay");if(!overlay)return;
    if(completed){
      if(data&&sleepPhrase){
        try{await commit(next=>next.sleepSessions.unshift({id:crypto.randomUUID(),timestamp:Date.now(),durationSeconds:sleepDuration,phraseId:sleepPhrase.id,phraseText:sleepPhrase.text,completed:true}));}
        catch(error){setMessage(byId("vault-message"),error.message,true);}
      }
      sleepLocked=true;overlay.classList.add("is-finished");
      byId("sleep-phase").textContent="SESSION COMPLETE";
      byId("sleep-guidance").textContent="You can let this be enough for tonight.";
      byId("sleep-phrase-display").textContent="";
      byId("sleep-clock").textContent=" ";
      byId("sleep-stop").hidden=true;
      byId("sleep-exit-hint").textContent="Press Escape to leave this quiet screen";
      sleepRemaining=0;sleepPhrase=null;
      return;
    }
    sleepLocked=false;overlay.hidden=true;overlay.classList.remove("is-finished");document.body.classList.remove("sleep-open");
    byId("sleep-stop").hidden=false;
    byId("sleep-exit-hint").textContent="Press Escape at any time to close";
    sleepRemaining=0;sleepPhrase=null;
  };
  const updateSleepScreen=()=>{
    if(!sleepPhrase)return;
    const elapsed=Math.floor((Date.now()-sleepStarted)/1000),somatic=sleepDuration===180?65:115;
    const phase=elapsed<somatic;
    byId("sleep-phase").textContent=phase?"LET THE DAY SETTLE":"A PHRASE TO CARRY";
    const prompts=sleepDuration===180
      ?["Notice where your body meets the surface beneath you.","Let your jaw soften, if that feels comfortable.","Notice your shoulders without needing to change them.","Feel the support beneath your feet or hands."]
      :["Notice the support beneath your body.","Let your forehead and jaw soften, if comfortable.","Notice your shoulders and hands as they are.","Feel the surface beneath your back.","Let your breath move at its own pace.","Notice one sound, then let it pass."];
    if(phase){const idx=Math.min(prompts.length-1,Math.floor(elapsed/(somatic/prompts.length)));byId("sleep-guidance").textContent=prompts[idx];}
    else{byId("sleep-guidance").textContent=sleepPhrase.text;byId("sleep-phrase-display").textContent=sleepPhrase.text;}
    const remain=Math.max(0,sleepDuration-elapsed);byId("sleep-clock").textContent=Math.floor(remain/60)+":"+String(remain%60).padStart(2,"0");
    if(remain<=0){sleepLocked=true;byId("sleep-phase").textContent="SESSION COMPLETE";byId("sleep-guidance").textContent="You can let this be enough for tonight.";byId("sleep-overlay").classList.add("is-finished");stopSleep(true);}
  };

  const render=()=>{
    if(!data)return;
    renderLogs();renderCheckins();renderEpisodes();renderPillarTwo();
    const tired=new Date().getHours()>=21||countInterventionsToday()>=4;
    byId("state-label").textContent=tired?"A slower pace may help":"Ready to reflect";
    byId("state-detail").textContent=countInterventionsToday()+" reframing "+(countInterventionsToday()===1?"exercise":"exercises")+" today · encrypted on this device";
    byId("state-orb").classList.toggle("is-rest",tired);
  };
  const classifyThought=value=>{
    const text=value.toLowerCase();
    if(/\b\d{1,4}\b/.test(text)||/\b(first|initial|only option|exactly)\b/.test(text))return "ANCHORING";
    if(/\b(last time|recently|again|news|happened before|the other day)\b/.test(text))return "AVAILABILITY_CASCADE";
    if(/\b(feel|afraid|anxious|panic|angry|terrified|worried|scared|heart|stress)\b/.test(text))return "AFFECT_HEURISTIC";
    return "WYSIATI";
  };
  let heuristicManuallySelected=false;
  const updateHeuristic=()=>{
    const value=byId("first-thought").value+" "+byId("trigger-text").value;
    const suggestion=classifyThought(value);
    if(!heuristicManuallySelected)byId("heuristic").value=suggestion;
    const chosen=heuristicManuallySelected?byId("heuristic").value:suggestion;
    byId("heuristic-hint").textContent=(heuristicManuallySelected?"Selected pattern: ":"Suggested pattern: ")+HEURISTICS[chosen]+". This is a simple text cue, not an assessment.";
  };
  const savePendingLog=async(status,intervention=null)=>{
    if(!pendingLog)return;
    const entry={...pendingLog,status};
    try{
      await commit(next=>{
        next.logs.unshift(entry);
        if(intervention)next.interventions.unshift(intervention);
      });
      pendingLog=null;
      byId("reframe-form").reset();byId("evidence-value").textContent="3";
      byId("reframe-card").hidden=true;byId("reset-card").hidden=true;
      byId("impulse-form").reset();heuristicManuallySelected=false;byId("severity-value").textContent="4";
      byId("heuristic-hint").textContent="A pattern suggestion can help name a thought; it is not a diagnosis.";
      byId("state-label").textContent=status==="RESOLVED"?"Reflection saved":"Quick log saved";
      byId("state-detail").textContent=status==="BYPASSED_DUE_TO_DEPLETION"?"You chose a pause instead of a longer exercise.":"Your entries are encrypted on this device.";
    }catch(error){setMessage(vaultMessage,error.message,true);vaultSection.hidden=false;workspace.hidden=true;}
  };
  const now=new Date();
  const toTime=value=>{
    const hours=Math.floor(value/60)%24,minutes=value%60;
    return String(hours).padStart(2,"0")+":"+String(minutes).padStart(2,"0");
  };
  const roundedNow=now.getHours()*60+now.getMinutes();
  byId("episode-start").value=toTime(roundedNow);
  byId("episode-end").value=toTime((roundedNow+30)%1440);
  const sliderIds={severity:"severity-value",calm:"calm-value",anxiety:"anxiety-value",focus:"focus-value",evidence:"evidence-value",happiness:"happiness-value",stress:"stress-value",episodeCalm:"episode-calm-value",dayRating:"day-rating-value"};
  document.querySelectorAll('input[type="range"]').forEach(input=>{
    const key=input.id==="episode-calm-value"?"episodeCalm":input.id;
    const outputId=sliderIds[input.id]||sliderIds[input.name]||sliderIds[key];
    const output=outputId&&byId(outputId);
    if(output){output.textContent=input.value;input.addEventListener("input",()=>output.textContent=input.value);}
  });
  byId("heuristic").addEventListener("change",()=>{heuristicManuallySelected=true;updateHeuristic();});
  byId("first-thought").addEventListener("input",updateHeuristic);
  byId("trigger-text").addEventListener("input",updateHeuristic);
  byId("severity").addEventListener("input",event=>byId("severity-value").textContent=event.target.value);
  byId("evidence-now").addEventListener("input",event=>byId("evidence-value").textContent=event.target.value);
  byId("day-rating").addEventListener("input",event=>byId("day-rating-value").textContent=event.target.value);
  byId("vault-form").addEventListener("submit",async event=>{
    event.preventDefault();vaultMessage.textContent="";
    if(!window.isSecureContext||!crypto.subtle){setMessage(vaultMessage,"Open this experience over HTTPS to create an encrypted vault.",true);return;}
    const existing=readEnvelope(),secret=passphrase.value;
    if(!existing){
      if(usernameInput.value.trim().length<2||usernameInput.value.trim().length>32){setMessage(vaultMessage,"Choose a username between 2 and 32 characters.",true);return;}
      if(secret.length<12){setMessage(vaultMessage,"Choose a passphrase with at least 12 characters.",true);return;}
      if(secret!==confirmPassphrase.value){setMessage(vaultMessage,"Those passphrases don't match yet.",true);return;}
      try{
        vaultSalt=crypto.getRandomValues(new Uint8Array(16));
        vaultKey=await deriveKey(secret,vaultSalt);
        data=emptyData();data.profile={username:usernameInput.value.trim()};
        await encryptData(data,vaultKey,vaultSalt);
        usernameInput.value="";passphrase.value="";confirmPassphrase.value="";
        unlock();
      }catch(error){data=null;vaultKey=null;vaultSalt=null;setMessage(vaultMessage,"The private vault could not be created in this browser. Please try again.",true);}
      return;
    }
    try{
      const unlocked=await decryptData(existing,secret);
      if(normalizeUsername(unlocked.value.profile?.username)!==normalizeUsername(usernameInput.value))throw new Error("Vault identity did not match");
      vaultKey=unlocked.key;vaultSalt=unlocked.salt;data=normalizeData(unlocked.value);
      usernameInput.value="";passphrase.value="";
      unlock();
    }catch(error){setMessage(vaultMessage,"That passphrase did not unlock this vault. Nothing was changed.",true);}
  });
  byId("impulse-form").addEventListener("submit",event=>{
    event.preventDefault();
    const severity=Number(byId("severity").value),thought=byId("first-thought").value.trim(),trigger=byId("trigger-text").value.trim();
    if(!trigger||!thought)return;
    const heuristic=byId("heuristic").value;
    pendingLog={
      id:crypto.randomUUID(),
      timestamp:Date.now(),
      triggerText:trigger,
      somaticResponse:byId("body-sensation").value.trim()||undefined,
      initialAssumption:thought,
      detectedHeuristic:heuristic,
      perceivedSeverity:severity
    };
    const fatigueLate=new Date().getHours()>=21,highStress=severity>=8,tooMany=countInterventionsToday()>=4;
    if(fatigueLate||highStress||tooMany){
      byId("reset-reason").textContent=highStress
        ?"You marked this as high intensity. Saving the moment is enough; you can decide later whether to explore it."
        :fatigueLate?"It's late. A short pause is a gentler next step than a demanding reflection."
        :"You've already done several reflection exercises today. Give your attention a rest.";
      byId("reset-card").hidden=false;byId("reframe-card").hidden=true;
      byId("state-label").textContent="A slower pace may help";
      byId("state-detail").textContent="The quick log is ready to save without a longer exercise.";
      byId("state-orb").classList.add("is-rest");
      byId("reset-card").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
      return;
    }
    const title=HEURISTICS[heuristic];
    byId("reframe-prompt").textContent="Your first impression may be "+title+". That label is only a prompt. Let's test the evidence and make space for another view.";
    byId("reframe-card").hidden=false;byId("reset-card").hidden=true;
    byId("reframe-card").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
  });
  byId("reframe-form").addEventListener("submit",async event=>{
    event.preventDefault();if(!pendingLog)return;
    const alternatives=[byId("alternative-one").value.trim(),byId("alternative-two").value.trim()];
    const level=pendingLog.perceivedSeverity<=4?"LOW":"MEDIUM";
    const intervention={
      logId:pendingLog.id,
      timestamp:Date.now(),
      counterEvidence:alternatives,
      evidenceToday:Number(byId("evidence-now").value),
      reframedPerspective:byId("reframed-view").value.trim(),
      cognitiveStrainLevel:level,
      status:"RESOLVED"
    };
    await savePendingLog("RESOLVED",intervention);
    byId("reframe-form").reset();
    byId("evidence-value").textContent="3";
  });
  byId("defer-reframe").addEventListener("click",()=>savePendingLog("PENDING"));
  byId("save-quick-log").addEventListener("click",()=>savePendingLog("BYPASSED_DUE_TO_DEPLETION"));
  byId("start-reset").addEventListener("click",event=>{
    if(resetTimer)clearInterval(resetTimer);
    const button=event.currentTarget;
    let remaining=40;
    byId("reset-breath").classList.add("is-active");
    byId("breath-instruction").textContent="Follow the circle: breathe in as it expands, and out as it softens.";
    button.disabled=true;button.textContent="Reset in progress · 40s";
    resetTimer=setInterval(()=>{
      remaining-=1;
      if(remaining<=0){
        clearInterval(resetTimer);resetTimer=null;
        byId("reset-breath").classList.remove("is-active");
        byId("breath-instruction").textContent="Pause here. You can stop, or save the quick log and return later.";
        button.disabled=false;button.textContent="Start a 40-second reset";
        return;
      }
      button.textContent="Reset in progress · "+remaining+"s";
    },1000);
  });
  byId("checkin-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const value=name=>Number(byId("checkin-form").querySelector('[name="'+name+'"]').value);
    const item={id:crypto.randomUUID(),timestamp:Date.now(),calm:value("calm"),anxiety:value("anxiety"),focus:value("focus")};
    try{await commit(next=>next.checkins.unshift(item));setMessage(byId("checkin-message"),"Moment saved in your encrypted local vault.");}
    catch(error){setMessage(byId("checkin-message"),error.message,true);}
  });
  byId("episode-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const [startHour,startMinute]=byId("episode-start").value.split(":").map(Number);
    const [endHour,endMinute]=byId("episode-end").value.split(":").map(Number);
    let start=startHour*60+startMinute,end=endHour*60+endMinute;
    if(end===start){byId("activity-name").setCustomValidity("Choose a scene that lasts at least one minute.");byId("activity-name").reportValidity();return;}
    if(end<start)end+=1440;
    const duration=end-start;
    if(duration>720){byId("activity-name").setCustomValidity("For this reconstruction, keep each scene to 12 hours or less.");byId("activity-name").reportValidity();return;}
    byId("activity-name").setCustomValidity("");
    const startDate=new Date();startDate.setHours(0,0,0,0);startDate.setMinutes(start);
    const endDate=new Date(startDate);endDate.setMinutes(end);
    const item={
      id:crypto.randomUUID(),day:todayKey(),startTime:byId("episode-start").value,endTime:byId("episode-end").value,
      startTimestamp:startDate.getTime(),endTimestamp:endDate.getTime(),activityName:byId("activity-name").value.trim(),
      durationMinutes:duration,
      experiencingAffect:{
        happiness:Number(byId("episode-form").querySelector('[name="happiness"]').value),
        stress:Number(byId("episode-form").querySelector('[name="stress"]').value),
        calm:Number(byId("episode-form").querySelector('[name="episodeCalm"]').value)
      }
    };
    const rating=Number(byId("day-rating").value),key=todayKey();
    try{
      await commit(next=>{
        next.episodes.push(item);
        next.days[key]={retrospective:rating,updatedAt:Date.now()};
      });
      byId("activity-name").value="";
      byId("episode-form").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest"});
    }catch(error){setMessage(vaultMessage,error.message,true);}
  });
  byId("watchman-thought").addEventListener("input",event=>{byId("watchman-prompt").textContent=thoughtReply(event.target.value);});
  byId("watchman-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const item={id:crypto.randomUUID(),timestamp:Date.now(),thought:byId("watchman-thought").value.trim(),reply:byId("watchman-response").value.trim()};
    try{await commit(next=>next.watchmanEntries.unshift(item));byId("watchman-form").reset();byId("watchman-response").value="I’m having a difficult thought, not a certainty. I can look at one next step.";byId("watchman-prompt").textContent="Your mind may be trying to protect you. We can pause before treating the thought as a fact.";}
    catch(error){setMessage(byId("vault-message"),error.message,true);}
  });
  const countWords=value=>value.trim().split(/\s+/).filter(Boolean).length;
  byId("phrase-text").addEventListener("input",event=>{const n=countWords(event.target.value);byId("phrase-count").textContent=n+" / 3–6 words";byId("phrase-count").classList.toggle("is-valid",n>=3&&n<=6);});
  byId("phrase-form").addEventListener("submit",async event=>{
    event.preventDefault();const text=byId("phrase-text").value.trim(),words=countWords(text);
    if(words<3||words>6){byId("phrase-text").setCustomValidity("Keep your phrase between 3 and 6 words.");byId("phrase-text").reportValidity();return;}
    byId("phrase-text").setCustomValidity("");
    const item={id:crypto.randomUUID(),timestamp:Date.now(),category:byId("phrase-category").value,text,outcome:byId("phrase-outcome").value.trim(),sensoryDetail:byId("phrase-senses").value.trim(),completionFeeling:byId("phrase-emotion").value.trim()};
    try{await commit(next=>next.phrases.unshift(item));byId("phrase-form").reset();byId("phrase-count").textContent="0 / 3–6 words";}
    catch(error){setMessage(byId("vault-message"),error.message,true);}
  });
  byId("sleep-form").addEventListener("submit",event=>{
    event.preventDefault();if(!byId("sleep-consent").checked)return;
    sleepPhrase=data.phrases.find(item=>item.id===byId("sleep-phrase").value);
    if(!sleepPhrase){setMessage(byId("vault-message"),"Save or choose a phrase before starting.",true);return;}
    sleepDuration=Number(byId("sleep-duration").value);sleepRemaining=sleepDuration;sleepStarted=Date.now();sleepLocked=false;
    byId("sleep-overlay").hidden=false;byId("sleep-overlay").classList.remove("is-finished");document.body.classList.add("sleep-open");
    byId("sleep-phrase-display").textContent=sleepPhrase.text;updateSleepScreen();
    sleepTimer=setInterval(updateSleepScreen,1000);
  });
  byId("sleep-stop").addEventListener("click",()=>stopSleep(false));
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!byId("sleep-overlay").hidden)stopSleep(false);});
  byId("release-score").addEventListener("input",event=>byId("release-score-value").textContent=event.target.value);
  byId("release-form").addEventListener("submit",async event=>{
    event.preventDefault();const score=Number(byId("release-score").value);
    const item={id:crypto.randomUUID(),timestamp:Date.now(),eventLabel:byId("release-event").value.trim(),note:byId("release-note").value.trim(),score,status:score>=8?"NEUTRAL_TODAY":"REVISIT_WHEN_READY"};
    try{await commit(next=>next.releaseChecks.unshift(item));byId("release-form").reset();byId("release-score-value").textContent="3";setMessage(byId("release-message"),score>=8?"Saved as feeling neutral today. You can still revisit this whenever you choose.":"Saved. You can return to this in your own time.");}
    catch(error){setMessage(byId("vault-message"),error.message,true);}
  });
  lockButton.addEventListener("click",lock);
  byId("delete-vault").addEventListener("click",()=>{
    if(!window.confirm("Delete the encrypted Yocare Health vault from this device? This cannot be undone."))return;
    localStorage.removeItem(STORAGE_KEY);lock();
  });
  window.addEventListener("pagehide",lock);
  setVaultMode();
})();