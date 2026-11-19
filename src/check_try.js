// Entfernt „Ausprobieren“-Knöpfe, deren Code im Playground nicht sauber läuft (Pseudocode, Fragmente).
// Geprüft wird wie im Playground: mit Sprachebene und Signaturprüfung.
const fs=require('fs');const path=require('path');const JS=path.join(__dirname,'..','assets','js');const M=require(path.join(JS,'racket.js'));global.window={MiniRacket:M};require(path.join(JS,'editor.js'));const E=window.RacketEditor;
const file=process.argv[2];const verbose=process.argv[3]==='-v';let s=fs.readFileSync(file,'utf8');let removed=0,kept=0;
s=s.replace(/<a class="trybtn( errok)?" href="playground\.html#code=([^"&]+)(?:&amp;lvl=(\w+))?">[^<]*<\/a>/g,(all,errok,b64,lvl)=>{
  if(errok){kept++;return all;}
  const code=Buffer.from(b64,'base64').toString('utf8');const it=new M.Interp({level:lvl||'vanilla',checkSigs:true});
  try{it.run(code);const bad=it.runTests().filter(r=>!r.ok);if(bad.length)throw new Error('test');
      const le=E.analyse(code,lvl||'vanilla').errs;if(le.length)throw new Error('lint: '+le.map(e=>e.msg).join(' | '));
      if(it.sigViolations.length)throw new Error('sig: '+it.sigViolations.map(v=>v.msg).join(' | '));}
  catch(e){removed++;if(verbose)console.log('ENTFERNT ['+lvl+']',e.message,'\n   ',code.slice(-200).replace(/\n/g,' ⏎ '));return '';}
  kept++;return all;});
fs.writeFileSync(file,s);console.log('Ausprobieren-Knöpfe:',kept,'behalten,',removed,'entfernt');
