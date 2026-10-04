(function(){
  var P=window.WR_PLAN;if(!P||!window.WR)return;
  var t=P.t,esc=WR.esc;
  function f(s,o){return s.replace(/\{(\w+)\}/g,function(_,k){return o[k];});}
  function km(a,b){var R=6371,r=Math.PI/180,x=(b[0]-a[0])*r,y=(b[1]-a[1])*r;var h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(y/2)*Math.sin(y/2);return 2*R*Math.asin(Math.sqrt(h));}
  function bearing(a,b){var r=Math.PI/180;var y=Math.sin((b[1]-a[1])*r)*Math.cos(b[0]*r),x=Math.cos(a[0]*r)*Math.sin(b[0]*r)-Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos((b[1]-a[1])*r);return (Math.atan2(y,x)/r+360)%360;}
  function adiff(a,b){var d=Math.abs(a-b)%360;return d>180?360-d:d;}
  var ROAD=1.3;
  var el=document.getElementById('map'),map=WR.map(el),layer=L.layerGroup().addTo(map),col=WR.col();
  var dayCol=[col.accent,col.vine,col.gold];
  var $=function(id){return document.getElementById(id);};
  function base(){var v=$('p-base').value,i=+v.slice(1);if(v[0]==='v'){var x=P.v[i];return {n:x[0],p:[x[1],x[2]]};}var s=P.s[i];return {n:s[2],p:[s[0],s[1]]};}
  function link(name,url){if(!url)return esc(name);var ext=/^https?:/.test(url);return '<a href="'+esc(url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+esc(name)+'</a>';}
  function run(ev){
    if(ev)ev.preventDefault();
    var B=base(),R=+$('p-mode').value,days=+$('p-days').value,wp=$('p-wine').value,fp=$('p-food').value;
    var reach=R/2/ROAD; /* straight-line radius: out and back within the day's range */
    var mode=R<=5?'walking':(R<=30?'bicycling':'driving');
    var W=P.w.filter(function(w){var d=km(B.p,[w[0],w[1]]);if(d>reach)return false;
      if(wp==='top')return w[4]>0; if(wp==='org')return w[6]===1; if(wp==='sweet')return w[7]===1; return w[5]===1;});
    var Eall=P.e.filter(function(e){return km(B.p,[e[0],e[1]])<=reach;});
    var Sall=P.s.filter(function(s){return km(B.p,[s[0],s[1]])<=reach;});
    $('p-reach').textContent=f(t.p_reach,{w:W.length,r:Eall.length,s:Sall.length});
    layer.clearLayers();
    L.circle(B.p,{radius:reach*1000,color:col.accent,weight:1,dashArray:'5 5',fillOpacity:.04,interactive:false}).addTo(layer);
    L.circleMarker(B.p,{radius:8,color:col.surface,weight:2,fillColor:col.accent,fillOpacity:1}).bindPopup('<b>'+esc(B.n)+'</b>').addTo(layer);
    var out=$('p-out');out.innerHTML='';
    if(!W.length){out.innerHTML='<p class="none">'+esc(t.p_none)+'</p>';map.setView(B.p,11);return;}
    W.forEach(function(w){w._s=w[4]*3+w[5]*2+(w[6]&&wp==='org'?3:0)+(w[7]&&wp==='sweet'?3:0);w._b=bearing(B.p,[w[0],w[1]]);});
    /* one direction per day */
    var seeds=[];W.slice().sort(function(a,b){return b._s-a._s;}).forEach(function(w){
      if(seeds.length>=days)return; if(seeds.every(function(s){return adiff(s._b,w._b)>(300/days)*0.5||km([s[0],s[1]],[w[0],w[1]])<1;})||seeds.length===0)seeds.push(w);});
    while(seeds.length<days)seeds.push(seeds[seeds.length-1]);
    var used={},usedE={},plans=[];
    for(var d=0;d<days;d++){
      var sb=seeds[d]._b;
      var pool=W.filter(function(w){if(used[w[2]])return false;var best=0,bd=999;seeds.forEach(function(s,i){var a=adiff(s._b,w._b);if(a<bd){bd=a;best=i;}});return best===d||days===1||seeds[best]===seeds[d];});
      if(!pool.length)pool=W.filter(function(w){return !used[w[2]];});
      var route=[],cur=B.p,len=0,max=R<=5?2:(R>=40?4:3);
      while(route.length<max){
        var cand=null,cs=-1e9;
        pool.forEach(function(w){if(used[w[2]]||route.indexOf(w)>=0)return;var p=[w[0],w[1]];
          var add=km(cur,p),back=km(p,B.p);if((len+add+back)*ROAD>R)return;var sc=w._s*2-add*1.2;if(sc>cs){cs=sc;cand=w;}});
        if(!cand)break; len+=km(cur,[cand[0],cand[1]]); cur=[cand[0],cand[1]]; route.push(cand); used[cand[2]]=1;
      }
      if(!route.length)continue;
      /* lunch near the middle of the route */
      var mid=route[Math.min(1,route.length-1)],mp=[mid[0],mid[1]];
      var ok=function(e){if(fp==='tavern')return e[6]===1;if(fp==='fine')return e[5]===1;if(fp==='regional')return e[7]===1||e[6]===1;return true;};
      var lunch=null,ls=-1e9;
      Eall.forEach(function(e){if(usedE[e[2]])return;var dd=km(mp,[e[0],e[1]]);if(dd>Math.max(3,reach/3))return;var sc=e[4]+(ok(e)?25:0)+(e[6]&&fp!=='fine'?12:0)-dd*6;if(sc>ls){ls=sc;lunch=e;}});
      if(lunch)usedE[lunch[2]]=1;
      var dinner=null,ds=-1e9;
      Eall.forEach(function(e){if(usedE[e[2]])return;var dd=km(B.p,[e[0],e[1]]);if(dd>Math.max(4,R>=40?reach:3))return;var sc=e[4]+(ok(e)?25:0)+(e[5]?20:0)-dd*4;if(sc>ds){ds=sc;dinner=e;}});
      if(dinner)usedE[dinner[2]]=1;
      var stops=[];route.forEach(function(w,i){stops.push({k:'w',x:w});if(i===Math.min(1,route.length-1)&&lunch)stops.push({k:'l',x:lunch});});
      if(lunch&&!stops.some(function(s){return s.k==='l';}))stops.push({k:'l',x:lunch});
      var pts=[B.p].concat(stops.map(function(s){return [s.x[0],s.x[1]];})).concat([B.p]),tot=0;
      for(var i=1;i<pts.length;i++)tot+=km(pts[i-1],pts[i]);
      plans.push({stops:stops,dinner:dinner,km:Math.round(tot*ROAD),pts:pts});
    }
    var bounds=[B.p];
    plans.forEach(function(pl,d){
      var c=dayCol[d%3];
      pl.line=L.polyline(pl.pts,{color:c,weight:3,opacity:.85,dashArray:'6 6'}).addTo(layer);
      pl.stops.forEach(function(s,i){var p=[s.x[0],s.x[1]];bounds.push(p);
        L.marker(p,{icon:L.divIcon({className:'wr-num',html:'<span style="background:'+c+'">'+(i+1)+'</span>',iconSize:[22,22]})}).bindPopup('<b>'+esc(s.x[2])+'</b><br>'+esc(s.x[3])).addTo(layer);});
      if(pl.dinner){var dp=[pl.dinner[0],pl.dinner[1]];bounds.push(dp);L.marker(dp,{icon:L.divIcon({className:'wr-sq eat award',iconSize:[12,12]})}).bindPopup('<b>'+esc(pl.dinner[2])+'</b>').addTo(layer);}
      var wps=pl.stops.map(function(s){return s.x[0]+','+s.x[1];}).join('|');
      var gl='https://www.google.com/maps/dir/?api=1&origin='+B.p[0]+','+B.p[1]+'&destination='+B.p[0]+','+B.p[1]+'&waypoints='+encodeURIComponent(wps)+'&travelmode='+mode;
      var li=pl.stops.map(function(s){var w=s.k==='w';return '<li><span class="k">'+(w?(s.x[4]?'<span class="stars">'+'★'.repeat(s.x[4])+'</span>':'·'):esc(t.lunch))+'</span> '+link(s.x[2],s.x[8])+' <span class="muted">'+esc(s.x[3])+'</span></li>';}).join('');
      if(pl.dinner)li+='<li><span class="k">'+esc(t.dinner)+'</span> '+link(pl.dinner[2],pl.dinner[8])+' <span class="muted">'+esc(pl.dinner[3])+'</span></li>';
      out.insertAdjacentHTML('beforeend','<section class="day" id="pday'+d+'" style="border-top-color:'+c+'"><h3>'+esc(f(t.day,{n:d+1}))+' <span class="muted">· <span class="km">'+esc(f(t.approx_km,{k:pl.km}))+'</span></span></h3><ol class="stops">'+li+'</ol><p><a href="'+esc(gl)+'" target="_blank" rel="noopener">'+esc(t.route_map)+' ↗</a> · <a href="#" class="gpx" data-day="'+d+'">GPX ↓</a></p></section>');
    });
    if(!plans.length)out.innerHTML='<p class="none">'+esc(t.p_none)+'</p>';
    var prof=mode==='bicycling'?'routed-bike':(mode==='walking'?'routed-foot':'routed-car');
    lastPlans=plans;
    plans.forEach(function(pl,d){routeDay(pl,d,prof,run.id);});
    map.fitBounds(L.latLngBounds(bounds).pad(0.15));
  }
  /* real route along roads and cycle paths (OpenStreetMap routing); keeps the estimate if the service cannot be reached */
  function routeDay(pl,d,prof,id){
    var coords=pl.pts.map(function(p){return p[1].toFixed(5)+','+p[0].toFixed(5);}).join(';');
    fetch('https://routing.openstreetmap.de/'+prof+'/route/v1/driving/'+coords+'?overview=full&geometries=geojson')
      .then(function(r){return r.json();}).then(function(j){
        if(run.id!==id||!j.routes||!j.routes[0])return;
        var rt=j.routes[0],kmv=Math.round(rt.distance/1000);
        pl.line.setLatLngs(rt.geometry.coordinates.map(function(c){return [c[1],c[0]];}));pl.line.setStyle({dashArray:null});
        var el=document.querySelector('#pday'+d+' .km');if(el)el.textContent=kmv+' km';
      }).catch(function(){});
  }
  /* GPX file of a day's route, for bike computers and map apps (works offline once saved) */
  var lastPlans=[];
  document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a.gpx');if(!a)return;ev.preventDefault();
    var pl=lastPlans[+a.dataset.day];if(!pl)return;var ll=pl.line.getLatLngs();
    var wpt=pl.stops.map(function(s){return '<wpt lat="'+s.x[0]+'" lon="'+s.x[1]+'"><name>'+esc(s.x[2])+'</name></wpt>';}).join('');
    var trk=ll.map(function(q){return '<trkpt lat="'+q.lat.toFixed(6)+'" lon="'+q.lng.toFixed(6)+'"/>';}).join('');
    var x='<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Wine Radar" xmlns="http://www.topografix.com/GPX/1/1">'+wpt+'<trk><name>Wine Radar '+esc(f(t.day,{n:+a.dataset.day+1}))+'</name><trkseg>'+trk+'</trkseg></trk></gpx>';
    var u=URL.createObjectURL(new Blob([x],{type:'application/gpx+xml'})),l=document.createElement('a');l.href=u;l.download='wineradar-day'+(+a.dataset.day+1)+'.gpx';document.body.appendChild(l);l.click();l.remove();setTimeout(function(){URL.revokeObjectURL(u);},2000);});
  run.id=0;var _run=run;run=function(e){_run.id=(_run.id||0)+1;run.id=_run.id;return _run(e);};
  /* shareable trips: the choices live in the address (#b=v3&m=20&d=2&w=any&f=any) */
  var IDS={b:'p-base',m:'p-mode',d:'p-days',w:'p-wine',f:'p-food'};
  function readHash(){var h=location.hash.replace(/^#/,'');if(!h)return;h.split('&').forEach(function(kv){var p=kv.split('='),el=$(IDS[p[0]]);if(el&&p[1]!=null){var v=decodeURIComponent(p[1]);if([].some.call(el.options,function(o){return o.value===v;}))el.value=v;}});}
  function hash(){return Object.keys(IDS).map(function(k){return k+'='+encodeURIComponent($(IDS[k]).value);}).join('&');}
  readHash();
  var _r2=run;run=function(e){var r=_r2(e);try{history.replaceState(null,'','#'+hash());}catch(x){}return r;};
  var sb=$('p-share');
  if(sb)sb.addEventListener('click',function(){
    var url=location.href.split('#')[0]+'#'+hash();
    if(navigator.share){navigator.share({title:document.title,url:url}).catch(function(){});return;}
    (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){sb.textContent=t.p_copied;setTimeout(function(){sb.textContent=t.p_share;},2000);},function(){window.prompt('',url);});
  });
  $('planner').addEventListener('submit',run);
  run();
})();
