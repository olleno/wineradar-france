/* Wine Radar på mobilen: appläge (service worker), sökknappen i menyraden och "spara regionen offline". */
(function(){
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
    navigator.serviceWorker.register('/sw.js').catch(function(){});
  }
  var s=document.querySelector('[data-tab=search]');
  if(s)s.addEventListener('click',function(e){
    e.preventDefault();
    var q=document.getElementById('q');
    if(q){window.scrollTo({top:0,behavior:'smooth'});setTimeout(function(){q.focus();},250);}
  });
  /* Klick ut från sajten räknas i GoatCounter som händelser, sorterade efter vart de går
     (ut-plus = Plus-formuläret, ut-booking/ut-gyg = affiliate, ut-karta = vägbeskrivning, ut-vingard = vingårdens sajt). */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="http"]');
    if(!a||a.host===location.host||!window.goatcounter||!window.goatcounter.count)return;
    var h=a.hostname.replace(/^www\./,''),k;
    if(/tally\.so|stripe\.com/.test(h))k='ut-plus';
    else if(/booking\.com/.test(h))k='ut-booking';
    else if(/getyourguide/.test(h))k='ut-gyg';
    else if(/google\.[a-z.]+$/.test(h)&&/maps/.test(a.pathname))k='ut-karta';
    else if(/wine-searcher|vivino|cellartracker|falstaff|gaultmillau|vinea/.test(h))k='ut-guide';
    else if(/skyscanner|kiwi|google\.[a-z.]+$/.test(h))k='ut-resa';
    else k='ut-vingard';
    window.goatcounter.count({path:k+'/'+h,title:location.pathname,event:true});
  },true);
  var b=document.getElementById('off-btn');
  if(b && ('caches' in window) && ('serviceWorker' in navigator)){
    var data=fetch(b.dataset.list).then(function(r){return r.json();});
    data.then(function(d){b.textContent+=' (≈ '+d.mb+' MB)';b.hidden=false;}).catch(function(){});
    b.addEventListener('click',function(){
      var st=document.getElementById('off-status'),D=b.dataset;
      b.disabled=true;
      data.then(function(d){var list=d.urls;
        return caches.open('wr-pages-v1').then(function(c){
          var n=0,fail=0,i=0;
          function next(){
            if(i>=list.length)return;
            var part=list.slice(i,i+6);i+=6;
            return Promise.all(part.map(function(u){return c.add(u).then(function(){n++;},function(){fail++;});})).then(function(){
              st.textContent=D.busy.replace('{n}',n).replace('{t}',list.length);
              return next();
            });
          }
          return Promise.resolve(next()).then(function(){
            st.textContent=fail?D.fail:D.done.replace('{n}',n);
          });
        });
      }).catch(function(){st.textContent=D.fail;}).then(function(){b.disabled=false;});
    });
  }
})();
