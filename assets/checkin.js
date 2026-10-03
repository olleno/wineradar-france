/* Wine Radar: checka in på vingårdar och sidan "Min vinresa".
   Incheckningar sparas bara i telefonen (localStorage 'wr-trip'), inget konto. Varje incheckning räknas anonymt i GoatCounter
   som händelsen checkin/<region>/<vingård>, så att vi kan visa vingårdarna hur många som kommer via Wine Radar. */
(function(){
  var KEY='wr-trip';
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}}
  function save(v){try{localStorage.setItem(KEY,JSON.stringify(v));return true;}catch(e){return false;}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function fill(s,o){return String(s).replace(/\{(\w+)\}/g,function(_,k){return o[k]!=null?o[k]:'';});}
  function dist(a,b,c,d){var R=6371000,r=Math.PI/180,x=(d-b)*r*Math.cos((a+c)/2*r),y=(c-a)*r;return Math.sqrt(x*x+y*y)*R;}
  function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function list(v){return Object.keys(v).map(function(k){var x=v[k];x.s=k;return x;}).sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:0;});}

  /* märken: [nyckel, uppnått?] – namnen kommer från sidans språk */
  function badges(v,T){
    var L=list(v),n=L.length,town={},reg={},day={},out=[];
    L.forEach(function(x){town[x.t+'|'+x.r]=(town[x.t+'|'+x.r]||0)+1;reg[x.r]=(reg[x.r]||0)+1;day[x.d]=(day[x.d]||0)+1;});
    function max(o){var m=0;for(var k in o)if(o[k]>m)m=o[k];return m;}
    out.push([T.b_first,n>=1],[T.b_5,n>=5],[T.b_10,n>=10],[T.b_25,n>=25],[T.b_village,max(town)>=3],[T.b_day,max(day)>=3],[T.b_two,Object.keys(reg).length>=2]);
    Object.keys(reg).forEach(function(r){out.push([fill(T.b_region,{r:r}),reg[r]>=5]);});
    return out;
  }

  /* ---- vingårdssidan ---- */
  var c=document.getElementById('checkin');
  if(c){
    var D=c.dataset,T=JSON.parse(D.i18n),btn=c.querySelector('button'),st=c.querySelector('.ci-status');
    var v=load();
    if(v[D.slug]){st.textContent=fill(T.done,{d:v[D.slug].d});}
    btn.hidden=false;
    var sb=c.querySelector('.ci-share');
    if(sb){sb.hidden=false;sb.addEventListener('click',function(){
      var txt=fill(T.wshare_txt,{name:D.name,town:D.town}),url='https://wineradar.net'+D.url;
      if(window.goatcounter&&window.goatcounter.count)window.goatcounter.count({path:'winery-share/'+D.rs+'/'+D.slug,title:D.name,event:true});
      sendImage(wcard(T,D),txt,url,st,T);
    });}
    btn.addEventListener('click',function(){
      if(!navigator.geolocation){st.textContent=T.nogeo;return;}
      btn.disabled=true;st.textContent=T.locating;
      navigator.geolocation.getCurrentPosition(function(pos){
        btn.disabled=false;
        var m=dist(pos.coords.latitude,pos.coords.longitude,+D.lat,+D.lon),lim=+D.rad+Math.min(pos.coords.accuracy||0,500);
        if(m>lim){st.textContent=fill(T.far,{km:(m/1000).toFixed(m<10000?1:0)});return;}
        var v=load(),first=!v[D.slug];
        v[D.slug]={n:D.name,t:D.town,r:D.region,rs:D.rs,w:D.slug,lat:+D.lat,lon:+D.lon,u:D.url,d:(v[D.slug]&&v[D.slug].d)||today()};
        if(window.WRC)window.WRC.checkin(D.rs,D.slug,pos.coords);   /* inloggad: sparas också i kontot (servern kontrollerar platsen igen) */
        save(v);
        st.textContent=fill(T.ok,{n:Object.keys(v).length});
        c.classList.add('done');
        if(first&&window.goatcounter&&window.goatcounter.count)window.goatcounter.count({path:'checkin/'+D.rs+'/'+D.slug,title:D.name,event:true});
      },function(){btn.disabled=false;st.textContent=T.nogeo;},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    });
  }

  /* ---- sidan Min vinresa ---- */
  var t=document.getElementById('trip');
  if(t){
    var T2=JSON.parse(t.dataset.i18n),V=load(),L=list(V),B=badges(V,T2);
    var won=B.filter(function(b){return b[1];}),left=B.filter(function(b){return !b[1];});
    var box=t.querySelector('.trip-body');
    if(!L.length){box.innerHTML='<p class="note">'+esc(T2.empty)+'</p>';}
    else{
      var h='<h2>'+esc(T2.badges)+' <span class="num">'+won.length+'</span></h2><ul class="badges">'+won.map(function(b){return '<li class="won">'+esc(b[0])+'</li>';}).join('')+'</ul>';
      if(left.length)h+='<h3>'+esc(T2.next)+'</h3><ul class="badges">'+left.map(function(b){return '<li>'+esc(b[0])+'</li>';}).join('')+'</ul>';
      h+='<p><button class="btn" type="button" id="trip-share">'+esc(T2.share)+'</button> <span class="ci-status" aria-live="polite"></span></p>';
      h+='<h2>'+esc(T2.visited)+' <span class="num">'+L.length+'</span></h2><div id="map" class="map small" role="img" aria-label="'+esc(T2.visited)+'"></div><ol class="visits">'+
        L.map(function(x){return '<li><a href="'+esc(x.u)+'">'+esc(x.n)+'</a> <span class="muted">'+esc(x.t)+' · '+esc(x.r)+' · <span class="num">'+esc(x.d)+'</span></span></li>';}).join('')+'</ol>';
      box.innerHTML=h;
      var el=document.getElementById('map');
      if(el&&window.WR&&window.L){
        try{var map=WR.map(el),pts=L.map(function(x){return [x.lat,x.lon];});
          L.forEach(function(x){WR.marker([x.lat,x.lon,x.n,x.t,0,1,x.u,1,'w']).addTo(map);});
          map.fitBounds(pts,{padding:[30,30],maxZoom:13});}catch(e){el.remove();}
      }else if(el)el.remove();
      document.getElementById('trip-share').addEventListener('click',function(){share(T2,L,won);});
    }
  }

  /* Wine Radars märke (glaset med radarbågar), samma som i sidhuvudet; ritas i rutan 130×120 */
  function logo(g,x,y,s,col){
    g.save();g.translate(x,y);g.scale(s,s);g.strokeStyle=col;g.fillStyle=col;g.lineWidth=6;g.lineCap='round';
    [['M70 40 a26 26 0 0 1 26 26',1],['M70 24 a42 42 0 0 1 42 42',.7],['M70 8 a58 58 0 0 1 58 58',.4]].forEach(function(a){g.globalAlpha=a[1];g.stroke(new Path2D(a[0]));});
    g.globalAlpha=1;g.fill(new Path2D('M44 18h12v22c0 4 10 10 10 22v46a4 4 0 0 1-4 4H38a4 4 0 0 1-4-4V62c0-12 10-18 10-22z'));
    g.fill(new Path2D('M42 12h16v8H42z'));g.restore();
  }
  /* Delningsbilden: hög (1080×1920) så att den passar Instagram Stories; allt viktigt i mitten så att ett vanligt inlägg också blir bra */
  function card(T,L,won){
    var W=1080,H=1920,cv=document.createElement('canvas');cv.width=W;cv.height=H;var g=cv.getContext('2d'),ink='#fcfbf9',gold='#ddb767';
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#7a1a38');gr.addColorStop(1,'#3e0c1c');g.fillStyle=gr;g.fillRect(0,0,W,H);
    logo(g,W/2-117,170,1.8,ink);
    g.fillStyle=ink;g.textAlign='center';g.font='700 58px system-ui,sans-serif';g.fillText('WINE RADAR',W/2,470);
    /* besökta vingårdar som guldprickar, utplacerade efter verkligt läge */
    var bx=140,by=560,bw=800,bh=440,la=L.map(function(x){return x.lat;}),lo=L.map(function(x){return x.lon;});
    var a0=Math.min.apply(0,la),a1=Math.max.apply(0,la),o0=Math.min.apply(0,lo),o1=Math.max.apply(0,lo),k=Math.cos((a0+a1)/2*Math.PI/180);
    var sx=(o1-o0)*k||1e-3,sy=(a1-a0)||1e-3,sc=Math.min(bw/sx,bh/sy);
    g.fillStyle=gold;L.forEach(function(x){var px=bx+bw/2+((x.lon-(o0+o1)/2)*k)*sc*(L.length>1?1:0),py=by+bh/2-(x.lat-(a0+a1)/2)*sc*(L.length>1?1:0);g.globalAlpha=.25;g.beginPath();g.arc(px,py,26,0,7);g.fill();g.globalAlpha=1;g.beginPath();g.arc(px,py,11,0,7);g.fill();});
    g.fillStyle=ink;g.font='800 300px system-ui,sans-serif';g.fillText(String(L.length),W/2,1330);
    var txt=T.card_txt||fill(T.share_txt,{n:L.length}),w=txt.split(' '),line='',y=1440;
    g.font='500 52px system-ui,sans-serif';
    w.forEach(function(x){var t=line?line+' '+x:x;if(g.measureText(t).width>900){g.fillText(line,W/2,y);y+=66;line=x;}else line=t;});g.fillText(line,W/2,y);
    g.font='400 38px system-ui,sans-serif';
    won.slice(0,3).forEach(function(b,i){g.fillStyle=gold;g.fillText('★',W/2-g.measureText(b[0]).width/2-30,y+95+i*56);g.fillStyle=ink;g.fillText(b[0],W/2+10,y+95+i*56);});
    logo(g,W/2-205,1772,.55,ink);g.textAlign='left';g.fillStyle=ink;g.font='600 46px system-ui,sans-serif';g.fillText('wineradar.net',W/2-120,1822);
    return cv;
  }
  /* bild för att dela en enskild vingård: "Värd ett besök", namnet, orten och regionen, och loggan */
  function wcard(T,D){
    var W=1080,H=1920,cv=document.createElement('canvas');cv.width=W;cv.height=H;var g=cv.getContext('2d'),ink='#fcfbf9',gold='#ddb767';
    var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#7a1a38');gr.addColorStop(1,'#3e0c1c');g.fillStyle=gr;g.fillRect(0,0,W,H);
    logo(g,W/2-117,230,1.8,ink);
    g.textAlign='center';g.fillStyle=ink;g.font='700 58px system-ui,sans-serif';g.fillText('WINE RADAR',W/2,530);
    g.fillStyle=gold;g.font='700 46px system-ui,sans-serif';g.fillText(T.wtag,W/2,820);
    g.fillStyle=ink;var size=110,w=D.name.split(' '),lines=[],line='';
    do{g.font='800 '+size+'px system-ui,sans-serif';lines=[];line='';w.forEach(function(x){var t=line?line+' '+x:x;if(g.measureText(t).width>920&&line){lines.push(line);line=x;}else line=t;});lines.push(line);size-=8;}while((lines.length>3||lines.some(function(l){return g.measureText(l).width>960;}))&&size>50);
    var y=980;lines.forEach(function(l){g.fillText(l,W/2,y);y+=size+18;});
    g.globalAlpha=.85;g.font='500 52px system-ui,sans-serif';g.fillText(D.town+' · '+D.region,W/2,y+60);g.globalAlpha=1;
    g.fillStyle=gold;g.beginPath();g.arc(W/2,y+190,14,0,7);g.fill();g.globalAlpha=.25;g.beginPath();g.arc(W/2,y+190,34,0,7);g.fill();g.globalAlpha=1;
    logo(g,W/2-205,1772,.55,ink);g.textAlign='left';g.fillStyle=ink;g.font='600 46px system-ui,sans-serif';g.fillText('wineradar.net',W/2-120,1822);
    return cv;
  }
  /* dela en bild via telefonens dela-meny; annars text med länk */
  function sendImage(cv,txt,url,st,T){
    function text(){
      if(navigator.share){navigator.share({title:'Wine Radar',text:txt,url:url}).catch(function(){});return;}
      try{navigator.clipboard.writeText(txt+' '+url).then(function(){st.textContent=T.copied;});}catch(e){st.textContent=txt+' '+url;}
    }
    try{cv.toBlob(function(b){
      var f=b&&window.File?new File([b],'wine-radar.png',{type:'image/png'}):null;
      if(f&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],text:txt+' '+url}).catch(function(){});}
      else text();
    },'image/png');}catch(e){text();}
  }
  function share(T,L,won){
    var st=document.querySelector('#trip .ci-status'),txt=fill(T.share_txt,{n:L.length}),url='https://wineradar.net/';
    if(window.goatcounter&&window.goatcounter.count)window.goatcounter.count({path:'trip-share',title:'share',event:true});
    function text(){
      if(navigator.share){navigator.share({title:'Wine Radar',text:txt,url:url}).catch(function(){});return;}
      try{navigator.clipboard.writeText(txt+' '+url).then(function(){st.textContent=T.copied;});}catch(e){st.textContent=txt+' '+url;}
    }
    try{card(T,L,won).toBlob(function(b){
      var f=b&&window.File?new File([b],'wine-radar.png',{type:'image/png'}):null;
      if(f&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],text:txt+' '+url}).catch(function(){});}
      else text();
    },'image/png');}catch(e){text();}
  }
})();
