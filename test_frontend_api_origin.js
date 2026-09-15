'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const {createFrontendServer}=require('./frontend-server');
const origin='https://backend-luavex.up.railway.app';
const siteOrigin='https://luavex.pntr.dev';
const dashboard=process.argv.includes('--committed-dashboard')?cp.execFileSync('git',['show','HEAD:app/dashboard.js'],{encoding:'utf8'}):fs.readFileSync('app/dashboard.js','utf8');
const api=fs.readFileSync('app/api.js','utf8');
async function check(config){
 const requests=[];let click;
 const window={LuavexAuth:{state:{authenticated:true}},SukaRedSettings:{load:()=>({protectionFeatures:{runtimeIntegrity:true}})}};
 const context=vm.createContext({window,location:{hostname:new URL(siteOrigin).hostname,origin:siteOrigin},URL,Blob,AbortController,performance,crypto:require('node:crypto').webcrypto,clearTimeout,
 fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({})}},
 getInput:()=>context.input,processing:false,disposed:true,candidate:false,status:{},errorPanel:{},controller:new AbortController(),applyAuth:()=>{},setStatus:()=>{},scheduleIdleStatus:()=>{},terminalStatus:false,statusResetTimer:null,
 obfuscate:{addEventListener:(_,fn)=>{click=fn},setAttribute(){},removeAttribute(){},classList:{add(){},remove(){}}}});
 if(config)vm.runInContext(config,context);
 vm.runInContext(api,context);await window.LuavexAPI.ready;
 vm.runInContext(dashboard,context);context.apiUrl=window.SukaRedDashboard.apiUrl;
 const start=dashboard.indexOf('        const runBuild = async () => {'),end=dashboard.indexOf("        obfuscate.addEventListener('click', runBuild);",start);
 assert(start>=0&&end>start);vm.runInContext(dashboard.slice(start,end).replace('const runBuild =', 'runBuild ='),context);click=context.runBuild;
 for(const input of ['print("hello")','loadstring(game:HttpGet("https://raw.githubusercontent.com/example/project/main/test.lua"))()']){
  context.input=input;await click();
  const r=requests.at(-1);assert.equal(r.url,origin+'/obfuscate');assert.equal(r.options.method,'POST');assert.equal(r.options.credentials,'include');
  assert.equal(JSON.parse(r.options.body).code,input);assert.equal(JSON.parse(r.options.body).features.runtimeIntegrity,true);
 }
 assert.equal(requests.length,2);
}
(async()=>{
 await check(fs.readFileSync('app/runtime-config.js','utf8'));await check('');
 const oldEnv=process.env.NODE_ENV,oldBase=process.env.LUAVEX_API_BASE;let server;
 try{process.env.NODE_ENV='production';delete process.env.LUAVEX_API_BASE;
  server=createFrontendServer().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const config=await(await fetch('http://127.0.0.1:'+server.address().port+'/app/runtime-config.js')).text();await check(config);
 }finally{if(server)await new Promise(r=>server.close(r));if(oldEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldEnv;if(oldBase===undefined)delete process.env.LUAVEX_API_BASE;else process.env.LUAVEX_API_BASE=oldBase;}
 const local={window:{},location:{hostname:'localhost',origin:'http://localhost:8080'},URL,fetch:async()=>({ok:true,json:async()=>({resourceCandidate:false,obfuscatePath:'/obfuscate'})})};
 vm.runInNewContext(api,local);await local.window.LuavexAPI.ready;assert.equal(local.window.LuavexAPI.base,'http://localhost:3001');
 console.log(JSON.stringify({passed:true,normalRequests:3,resourceRequests:3,staticConfig:'PASS',generatedConfig:'PASS',productionFallback:'PASS',localFallback:'PASS',url:origin+'/obfuscate'}));
})().catch(e=>{console.error(e);process.exitCode=1});

