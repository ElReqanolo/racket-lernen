(function(){
 localStorage.clear();
 var D=JSON.parse(document.getElementById('aufgaben-daten').textContent);
 var lis=[].slice.call(document.querySelectorAll('li.task'));
 var noUI=[];
 lis.forEach(function(li){
   var k=li.dataset.kap,l=li.dataset.label,ch=D.kap[k],q=(ch.quiz||{})[l];
   var work=li.querySelector('.aufgabe-work'); if(!work){noUI.push(li.id);return;}
   var ta=work.querySelector('textarea');
   if(ta){ var ref=ch.segs[l]||''; ta.value='(define nix 1)'; }
   if(q){ (q.questions||[]).forEach(function(qq,qi){ var f=work.querySelector('fieldset[data-qi="'+qi+'"]'); var want=Array.isArray(qq.correct)?qq.correct:[qq.correct]; f.querySelectorAll('input').forEach(function(inp){inp.checked=(want.indexOf(+inp.value)<0 && +inp.value===(want[0]===0?1:0));}); });
          (q.fields||[]).forEach(function(fd,fi){ work.querySelector('input[data-fi="'+fi+'"]').value='falsch'; }); }
   work.querySelector('.pruefen').click();
 });
 setTimeout(function(){
   var notDone=lis.filter(function(li){return !li.classList.contains('done');}).map(function(li){var r=li.querySelector('.res-head');return li.id+':'+(r?r.textContent.slice(0,60):'-');});
   document.title='tasks='+lis.length+' noUI='+noUI.join(',')+' notDone='+notDone.length+' '+notDone.join(' | ')+' prog='+document.querySelector('.curprog').textContent;
 },8000);
})();
