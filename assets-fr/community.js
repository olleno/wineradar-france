/* Wine Radar gemenskap (fas A): konto med inloggningslänk, profil, incheckningar i molnet, tips och "Årets upptäckare".
   Aktiv bara när sidan har <meta name="wr-api"> (adressen till API:t). Texterna kommer i <script id="wr-cm" type="application/json">.
   Inloggningen sparas i telefonen som 'wr-session'. Incheckningar i telefonen ('wr-trip') flyttas till kontot vid inloggning. */
(function(){
  var M=document.querySelector('meta[name="wr-api"]'),J=document.getElementById('wr-cm');
  if(!M||!J)return;
  var API=M.content.replace(/\/$/,''),T=JSON.parse(J.textContent),LANG=document.documentElement.lang.slice(0,2);
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function fill(s,o){return String(s).replace(/\{(\w+)\}/g,function(_,k){return o[k]!=null?o[k]:'';});}
  function get(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function put(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}}
  function sess(){return get('wr-session');}
  function call(path,method,body){
    var h={'content-type':'application/json'},s=sess();if(s)h.authorization='Bearer '+s;
    return fetch(API+path,{method:method||'GET',headers:h,body:body?JSON.stringify(body):undefined})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(r.status===401&&s){put('wr-session',null);}return {s:r.status,j:j};});})
      .catch(function(){return {s:0,j:{error:'net'}};});
  }
  function errText(code){return {email:T.e_email,adult:T.e_adult,nick:T.e_nick,nick_taken:T.e_taken,slow_down:T.e_slow,link_expired:T.e_expired,nick_needed:T.e_need_nick,not_allowed:T.tip_no,checkin_first:T.tip_first}[code]||T.e_gen;}
  function local(){try{return JSON.parse(get('wr-trip')||'{}')||{};}catch(e){return {};}}
  var WIN=null;
  function wineries(){
    if(WIN)return Promise.resolve(WIN);
    var a=document.querySelector('script[src*="community.js"]'),base=a?a.src.replace(/community\.js.*$/,''):'/assets/';
    return fetch(base+'wineries-api.json').then(function(r){return r.json();}).then(function(j){WIN=j;return j;});
  }
  /* telefonens besök -> [{region, winery, day}] (äldre besök saknar region: läses ur sidans adress) */
  function localVisits(){
    var v=local(),out=[];
    Object.keys(v).forEach(function(k){var x=v[k],seg=(x.u||'').split('/').filter(Boolean);out.push({region:x.rs||seg[seg.length-3],winery:x.w||k,day:x.d});});
    return out;
  }
  /* kontots besök in i telefonen, så att Min vinresa visar allt även på en ny telefon */
  function syncDown(list){
    return wineries().then(function(W){
      var v=local(),added=0;
      list.forEach(function(c){var w=W[c.region+'/'+c.winery];if(!w||v[c.winery])return;
        v[c.winery]={n:w[3],t:w[4],r:w[5],rs:c.region,w:c.winery,lat:w[0],lon:w[1],u:w[6],d:c.day};added++;});
      if(added)put('wr-trip',JSON.stringify(v));
      return added;
    });
  }

  window.WRC={
    loggedIn:function(){return !!sess();},
    checkin:function(region,winery,co){
      if(!sess())return Promise.resolve(null);
      return call('/checkins','POST',{region:region,winery:winery,lat:co.latitude,lon:co.longitude,acc:co.accuracy});
    }
  };

  /* ---- inloggningslänken från mejlet: #login=... ---- */
  window.addEventListener('hashchange',function(){if(/login=/.test(location.hash))location.reload();});
  var m=location.hash.match(/login=([\w-]+)/);
  var ready=Promise.resolve();
  if(m){
    history.replaceState(null,'',location.pathname+location.search);
    ready=call('/auth/verify','POST',{token:m[1]}).then(function(r){
      if(r.j.session){
        put('wr-session',r.j.session);
        return call('/me/import','POST',{visits:localVisits()}).then(function(){return call('/me');}).then(function(me){
          return syncDown((me.j&&me.j.checkins)||[]).then(function(){put('wr-flash',T.imported);location.reload();return new Promise(function(){});});
        });
      }
      put('wr-flash',errText(r.j.error));
    });
  }

  ready.then(function(){
    account(); community(); explorers();
  });

  /* ---- kontorutan på Min vinresa ---- */
  function account(){
    var box=document.getElementById('account');if(!box)return;
    var flash=get('wr-flash');put('wr-flash',null);
    if(!sess()){
      box.innerHTML='<h2>'+esc(T.acc_h)+'</h2><p>'+esc(T.acc_txt)+'</p>'+
        '<form class="acc-form"><input type="email" required autocomplete="email" placeholder="'+esc(T.email_ph)+'" aria-label="'+esc(T.email_ph)+'">'+
        '<label class="chk"><input type="checkbox"> '+esc(T.adult)+'</label><button class="btn" type="submit">'+esc(T.send)+'</button></form>'+
        '<p class="acc-msg" aria-live="polite">'+esc(flash||'')+'</p><p class="small"><a href="'+esc(box.dataset.privacy)+'">'+esc(T.privacy)+'</a></p>';
      var f=box.querySelector('form'),msg=box.querySelector('.acc-msg');
      f.addEventListener('submit',function(e){e.preventDefault();
        var b=f.querySelector('button');b.disabled=true;
        call('/auth/start','POST',{email:f.querySelector('input[type=email]').value,adult:f.querySelector('input[type=checkbox]').checked,lang:LANG,back:location.href.split('#')[0]})
          .then(function(r){b.disabled=false;msg.textContent=r.j.ok?T.sent:errText(r.j.error);});
      });
      return;
    }
    call('/me').then(function(r){
      if(r.s!==200){put('wr-session',null);account();return;}
      var me=r.j.me;
      var tn=document.getElementById('trip-note');if(tn)tn.hidden=true;
      syncDown(r.j.checkins||[]).then(function(n){if(n)location.reload();});
      var cs=['AT','DE','CH','NL','BE','SE','DK','NO','FI','GB','US','CZ','SK','HU','PL','IT','FR'],opt='<option value=""></option>'+cs.map(function(c){return '<option'+(me.country===c?' selected':'')+'>'+c+'</option>';}).join('');
      box.innerHTML='<h2>'+esc(T.acc_h)+'</h2><p class="acc-msg" aria-live="polite">'+esc(flash||'')+'</p>'+
        '<form class="acc-form prof"><label>'+esc(T.nick)+'<input name="nick" maxlength="24" value="'+esc(me.nick||'')+'"></label>'+
        '<label>'+esc(T.country)+'<select name="country">'+opt+'</select></label>'+
        '<label class="chk"><input type="checkbox" name="public"'+(me.public?' checked':'')+'> '+esc(T.public)+'</label>'+
        '<button class="btn" type="submit">'+esc(T.save)+'</button></form>'+
        '<p class="small acc-links"><a href="#" data-a="export">'+esc(T.export)+'</a> · <a href="#" data-a="logout">'+esc(T.logout)+'</a> · <a href="#" data-a="delete">'+esc(T.delete)+'</a> · <a href="'+esc(box.dataset.privacy)+'">'+esc(T.privacy)+'</a></p>';
      var f=box.querySelector('form'),msg=box.querySelector('.acc-msg');
      f.addEventListener('submit',function(e){e.preventDefault();
        call('/me','PATCH',{nick:f.nick.value,country:f.country.value,public:f.public.checked}).then(function(r){msg.textContent=r.s===200?T.saved:errText(r.j.error);});
      });
      box.querySelector('.acc-links').addEventListener('click',function(e){
        var a=e.target.dataset&&e.target.dataset.a;if(!a)return;e.preventDefault();
        if(a==='logout')call('/auth/logout','POST').then(function(){put('wr-session',null);account();});
        if(a==='delete'&&window.confirm(T.delete_q))call('/me','DELETE').then(function(){put('wr-session',null);account();});
        if(a==='export')call('/me/export').then(function(r){
          var u=URL.createObjectURL(new Blob([JSON.stringify(r.j,null,2)],{type:'application/json'})),l=document.createElement('a');
          l.href=u;l.download='wine-radar.json';document.body.appendChild(l);l.click();l.remove();
        });
      });
    });
  }

  /* ---- vingårdssidan: besökare i år, nyligen här, tips ---- */
  function community(){
    var box=document.getElementById('community');if(!box)return;
    var R=box.dataset.region,Wn=box.dataset.winery;
    call('/winery?region='+encodeURIComponent(R)+'&winery='+encodeURIComponent(Wn)).then(function(r){
      var d=r.j||{},h='';
      if(d.visitors_year)h+='<p class="cm-count">'+esc(fill(T.visitors,{n:d.visitors_year}))+'</p>';
      if(d.recent&&d.recent.length)h+='<p class="muted">'+esc(T.recent)+': '+d.recent.map(function(x){return esc(x.nick)+(x.country?' ('+esc(x.country)+')':'');}).join(', ')+'</p>';
      h+='<h2>'+esc(T.tips_h)+'</h2>';
      h+=(d.tips&&d.tips.length)?'<ul class="tips">'+d.tips.map(function(t){return '<li lang="'+esc(t.lang)+'"><p>'+esc(t.text)+'</p><span class="muted small">'+esc(t.nick||T.anon)+' · '+esc(t.month)+' · <a href="#" data-r="'+t.id+'">'+esc(T.report)+'</a></span></li>';}).join('')+'</ul>':'<p class="muted">'+esc(T.no_tips)+'</p>';
      if(sess())h+='<form class="tip-form"><textarea maxlength="280" rows="3" placeholder="'+esc(T.tip_ph)+'" aria-label="'+esc(T.tip_ph)+'"></textarea><button class="btn ghost" type="submit">'+esc(T.tip_send)+'</button></form>';
      else h+='<p><a href="'+esc(box.dataset.trip)+'">'+esc(T.tip_login)+' →</a></p>';
      h+='<p class="tip-msg" aria-live="polite"></p>';
      box.innerHTML=h;box.hidden=false;
      var msg=box.querySelector('.tip-msg'),f=box.querySelector('.tip-form');
      if(f)f.addEventListener('submit',function(e){e.preventDefault();
        call('/tips','POST',{region:R,winery:Wn,text:f.querySelector('textarea').value,lang:LANG}).then(function(r){
          if(r.s===200){msg.textContent=T.tip_ok;setTimeout(community,800);}else msg.textContent=errText(r.j.error);
        });
      });
      box.addEventListener('click',function(e){var id=e.target.dataset&&e.target.dataset.r;if(!id)return;e.preventDefault();
        call('/tips/'+id+'/report','POST').then(function(){e.target.replaceWith(document.createTextNode(T.reported));});
      },{once:false});
    });
  }

  /* ---- Årets upptäckare ---- */
  function explorers(){
    var box=document.getElementById('explorers');if(!box)return;
    var regions=JSON.parse(box.dataset.regions||'[]');
    function show(rs){
      call('/leaderboard'+(rs?'?region='+encodeURIComponent(rs):'')).then(function(r){
        var L=(r.j&&r.j.explorers)||[],h='<p class="chips">'+[['',T.ex_all]].concat(regions).map(function(x){return '<a href="#" class="chip'+(x[0]===(rs||'')?' on':'')+'" data-rs="'+esc(x[0])+'">'+esc(x[1])+'</a>';}).join('')+'</p>';
        h+=L.length?'<ol class="toplist">'+L.map(function(x){return '<li><b>'+esc(x.nick)+'</b>'+(x.country?' <span class="muted">'+esc(x.country)+'</span>':'')+' <span class="num">'+x.n+' '+esc(T.ex_n)+'</span></li>';}).join('')+'</ol>':'<p class="note">'+esc(T.ex_empty)+'</p>';
        h+='<p><a class="btn" href="'+esc(box.dataset.trip)+'">'+esc(T.ex_join)+'</a></p>';
        box.innerHTML=h;
      });
    }
    box.addEventListener('click',function(e){var rs=e.target.dataset&&e.target.dataset.rs;if(rs==null)return;e.preventDefault();show(rs);});
    show('');
  }
})();
