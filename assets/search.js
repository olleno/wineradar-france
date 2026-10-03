/* Site search: loads a small per-language index on first use, matches as you type. Works on every page, also after the preview swaps pages. */
(function(){
  if(window.__wrSearch)return;window.__wrSearch=true;
  var IX={};
  var COMING=[['Wachau',['wachau']],['Kamptal',['kamptal']],['Kremstal',['kremstal']],['Südsteiermark',['sudsteiermark','steiermark','styria']],['Wien',['wien','vienna','vienne','viena']],
    ['Chianti Classico',['chianti','toscana','tuscany','toskana','toscane']],['Rioja',['rioja']],['Bourgogne',['bourgogne','burgundy','burgund','borgogna']],
    ['Piemonte',['piemonte','piedmont','piemont','barolo','barbaresco']],['Bordeaux',['bordeaux']],['Champagne',['champagne','champagner']]];
  function fold(s){return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').toLowerCase();}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function load(inp){var l=inp.dataset.lang;if(IX[l])return IX[l];
    IX[l]=fetch(inp.dataset.base+'search-'+l+'.json').then(function(r){return r.json();}).then(function(a){a.forEach(function(e){e.f=fold(e[0]+' '+e[1]);});return a;});return IX[l];}
  function show(inp){var ul=inp.parentNode.querySelector('.srch-res'),q=fold(inp.value.trim());
    if(q.length<2){ul.hidden=true;ul.innerHTML='';return;}
    load(inp).then(function(a){var words=q.split(/\s+/);
      var hits=a.filter(function(e){return words.every(function(w){return e.f.indexOf(w)>=0;});});
      hits.sort(function(x,y){var px=fold(x[0]).indexOf(q)===0?0:1,py=fold(y[0]).indexOf(q)===0?0:1;return px-py||(x[3]==='v'?-1:0)-(y[3]==='v'?-1:0)||x[0].localeCompare(y[0]);});
      ul.innerHTML=hits.slice(0,8).map(function(e){return '<li><a href="'+esc(inp.dataset.root+e[2])+'"><span class="k k-'+e[3]+'" aria-hidden="true"></span><b>'+esc(e[0])+'</b><span class="s">'+esc(e[1])+'</span></a></li>';}).join('');
      if(!hits.length){var c=COMING.filter(function(r){return r[1].some(function(k){return k.indexOf(q)===0||q.indexOf(k)===0;});})[0];
        if(c){ul.innerHTML='<li class="soon"><b>'+esc(c[0])+'</b><span class="s">'+esc(inp.dataset.coming)+'</span><a href="mailto:'+esc(inp.dataset.mail)+'?subject='+encodeURIComponent('Wine Radar: '+c[0])+'">✉ '+esc(inp.dataset.mail)+'</a></li>';ul.hidden=false;return;}}
      ul.hidden=!hits.length;});}
  document.addEventListener('input',function(ev){if(ev.target&&ev.target.id==='q')show(ev.target);});
  document.addEventListener('focusin',function(ev){if(ev.target&&ev.target.id==='q')load(ev.target);});
  document.addEventListener('keydown',function(ev){var t=ev.target;if(!t||t.id!=='q')return;var ul=t.parentNode.querySelector('.srch-res');
    if(ev.key==='Enter'){var a=ul.querySelector('a');if(a){ev.preventDefault();a.click();}}
    if(ev.key==='Escape'){ul.hidden=true;}
    if(ev.key==='ArrowDown'){var f=ul.querySelector('a');if(f){ev.preventDefault();f.focus();}}});
  document.addEventListener('click',function(ev){var f=document.querySelector('.srch');if(f&&!f.contains(ev.target)){var ul=f.querySelector('.srch-res');if(ul)ul.hidden=true;}});
})();
