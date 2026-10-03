/* Wine Radar service worker: sidor man besökt eller sparat fungerar utan täckning.
   Sidor: nätet först, sparad kopia om nätet saknas. Egna filer: sparad kopia direkt, uppdateras i bakgrunden.
   Karta, typsnitt och kartbibliotek: sparas när de används, så att kartan fungerar där man redan har tittat. */
var PAGES='wr-pages-v1',STATIC='wr-static-v1',EXT='wr-ext-v1';
var MSG={"": "You are offline. This page has not been saved yet.", "de": "Sie sind offline. Diese Seite wurde noch nicht gespeichert.", "fr": "Vous êtes hors ligne. Cette page n’a pas encore été enregistrée.", "it": "Sei offline. Questa pagina non è ancora stata salvata.", "es": "Estás sin conexión. Esta página aún no se ha guardado.", "nl": "Je bent offline. Deze pagina is nog niet opgeslagen.", "sv": "Du är offline. Den här sidan är inte sparad än.", "no": "Du er frakoblet. Denne siden er ikke lagret ennå.", "da": "Du er offline. Denne side er ikke gemt endnu.", "fi": "Olet offline-tilassa. Tätä sivua ei ole vielä tallennettu.", "pl": "Jesteś offline. Ta strona nie została jeszcze zapisana.", "cs": "Jste offline. Tato stránka zatím není uložena.", "sk": "Ste offline. Táto stránka ešte nie je uložená.", "hu": "Offline vagy. Ez az oldal még nincs mentve.", "sl": "Niste povezani. Ta stran še ni shranjena.", "hr": "Niste povezani. Ova stranica još nije spremljena.", "pt": "Está offline. Esta página ainda não foi guardada.", "ro": "Ești offline. Această pagină nu a fost încă salvată.", "bg": "Вие сте офлайн. Тази страница още не е запазена.", "el": "Είστε εκτός σύνδεσης. Αυτή η σελίδα δεν έχει αποθηκευτεί ακόμη.", "et": "Oled võrguühenduseta. Seda lehte pole veel salvestatud.", "lv": "Tu esi bezsaistē. Šī lapa vēl nav saglabāta.", "lt": "Esi neprisijungęs. Šis puslapis dar neišsaugotas."};

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(STATIC).then(function(c){
    return c.addAll(['/assets/site.css','/assets/search.js','/assets/mobile.js','/assets/map.js','/assets/basemap.js','/assets/favicon.svg']);
  }).catch(function(){}));
});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});

function offlinePage(url){
  var seg=new URL(url).pathname.split('/')[1]||'';
  var msg=MSG[seg]||MSG['']||'You are offline.';
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wine Radar</title>'+
    '<body style="font-family:system-ui,sans-serif;padding:2rem 1.2rem;max-width:32rem;color:#2a2224;background:#fcfbf9">'+
    '<h1 style="color:#6b1631">Wine Radar</h1><p>'+msg+'</p><p><a href="javascript:history.back()" style="color:#6b1631">&larr;</a></p>',
    {headers:{'Content-Type':'text/html; charset=utf-8'}});
}

self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET')return;
  var u=new URL(r.url);
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(function(res){
      if(res.ok){var cp=res.clone();caches.open(PAGES).then(function(c){c.put(r,cp);});}
      return res;
    }).catch(function(){
      return caches.match(r,{ignoreSearch:true}).then(function(m){return m||offlinePage(r.url);});
    }));
    return;
  }
  if(u.origin===location.origin){
    e.respondWith(caches.match(r).then(function(m){
      var f=fetch(r).then(function(res){
        if(res.ok){var cp=res.clone();caches.open(STATIC).then(function(c){c.put(r,cp);});}
        return res;
      }).catch(function(){return m;});
      return m||f;
    }));
    return;
  }
  if(/(^|\.)(openfreemap\.org|unpkg\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)){
    e.respondWith(caches.match(r).then(function(m){
      return m||fetch(r).then(function(res){
        if(res.ok){var cp=res.clone();caches.open(EXT).then(function(c){c.put(r,cp);});}
        return res;
      });
    }));
  }
});
