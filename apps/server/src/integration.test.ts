import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { io, Socket } from 'socket.io-client';
import type { Snapshot, Reply, Action } from '@connecta-focus/shared';
import { pool } from './db';
const origin='http://127.0.0.1:3002';
const sockets:Socket[]=[];
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(fn:()=>boolean|Promise<boolean>,name:string,timeout=12000){const start=Date.now();while(!await fn()){if(Date.now()-start>timeout)throw new Error('Timed out: '+name);await pause(40);}}
interface Client { id:string;token:string;socket:Socket;state:Snapshot|null; replaced:boolean }
async function request(path:string,token='',body?:unknown,method?:string){const r=await fetch(origin+'/api'+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function connect(token:string,id:string){const c:Client={id,token,socket:io(origin,{auth:{token},autoConnect:false,transports:['websocket']}),state:null,replaced:false};sockets.push(c.socket);c.socket.on('snapshot',s=>c.state=s);c.socket.on('replaced',()=>c.replaced=true);c.socket.connect();await until(()=>!!c.state,'initial snapshot');return c;}
async function make(i:number){const r=await request('/auth/register','',{email:`test-${randomUUID()}@connecta.test`,password:'Demo-only-test-123',nickname:`Tester ${i}`,avatarPreset:`preset-${i%4+1}`});assert.equal(r.status,200,JSON.stringify(r.data));return connect(r.data.token,r.data.user.id);}
function action(c:Client,a:Action,data:unknown={}){return new Promise<Reply>((resolve,reject)=>{c.socket.timeout(5000).emit('action',a,data,(err:Error,res:Reply)=>err?reject(err):resolve(res));});}
async function ok(c:Client,a:Action,data:unknown={}){const r=await action(c,a,data);assert.equal(r.ok,true,`${a}: ${r.error}`);return r;}
async function no(c:Client,a:Action,data:unknown={}){assert.equal((await action(c,a,data)).ok,false,a+' must reject');}
const checks:string[]=[];
const passed=(s:string)=>{checks.push(s);console.log('PASS '+s);};
let server:ReturnType<typeof spawn>;
async function start(){server=spawn(process.execPath,['--import','tsx','src/index.ts'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'test',PORT:'3002',TEST_FOCUS_MS:'5000',TEST_BREAK_MS:'1500',TEST_SEAT_MS:'700',TEST_EMPTY_MS:'1700'},stdio:['ignore','pipe','pipe'],windowsHide:true});server.stderr?.on('data',b=>process.stderr.write(b));await until(async()=>{try{return(await fetch(origin+'/api/health')).ok;}catch{return false;}},'test server');}
async function reflectPending(c:Client){await ok(c,'sync');for(const p of c.state!.personal.pending)await ok(c,'session:reflect',{sessionId:p.id,goalOutcome:'achieved',obstacles:'PRIVATE OBSTACLE',nextSteps:'PRIVATE NEXT'});}
async function main(){
  await start();
  const a=await make(0),b=await make(1),c=await make(2),d=await make(3);
  const code=(await ok(a,'room:create')).code!;
  for(const member of [b,c,d])await ok(member,'room:join',{code});
  passed('authenticated create/join and real presence');
  const seats=await Promise.all([action(a,'table:sit',{table:0,seat:0}),action(b,'table:sit',{table:0,seat:0})]);assert.equal(seats.filter(r=>r.ok).length,1);
  const first=seats[0].ok?a:b,second=seats[0].ok?b:a;
  await ok(second,'table:sit',{table:0,seat:1});await ok(c,'table:sit',{table:1,seat:0});
  await no(d,'table:sit',{table:-1,seat:0});await no(d,'table:sit',{table:0,seat:8});
  passed('seat concurrency and bounds; no overwrite');
  await ok(first,'session:goal',{text:'PRIVATE GOAL',shared:false});await ok(first,'session:ready');
  await no(first,'session:start');
  await ok(second,'session:goal',{text:'SHARED GOAL',shared:true});await ok(second,'session:ready');
  assert(!JSON.stringify(second.state).includes('PRIVATE GOAL'));assert(!JSON.stringify(c.state).includes('SHARED GOAL'));assert(JSON.stringify(first.state).includes('SHARED GOAL'));
  passed('ready requires every seat; goal privacy at socket payload boundary');
  const starts=await Promise.all([action(first,'session:start'),action(first,'session:start')]);assert.equal(starts.filter(r=>r.ok).length,1);
  const sessionId=first.state!.personal.active!.sessionId,focusEnd=first.state!.personal.active!.focusEnd;
  await no(first,'session:goal',{text:'mutated goal',shared:true});await no(first,'table:stand');await no(first,'session:solo');
  await ok(d,'table:sit',{table:0,seat:2});assert.equal(d.state!.personal.active,null);
  passed('idempotent start, immutable goal, one active participation, late join waits');
  await ok(c,'session:goal',{text:'Independent table',shared:false});await ok(c,'session:ready');await ok(c,'session:start');assert.notEqual(c.state!.personal.active!.id,first.state!.personal.active!.id);
  await ok(first,'chat:send',{text:'hello during focus'});assert(second.state!.room!.chat.some(m=>m.text==='hello during focus'));
  await no(first,'chat:send',{text:'x'.repeat(201)});
  passed('independent table cycles and room chat while focusing');
  first.socket.disconnect();await pause(1000);
  await ok(d,'sync');assert(!d.state!.room!.tables[0].seats.includes(first.id));
  const back=await connect(first.token,first.id);assert.equal(back.state!.personal.active!.sessionId,sessionId);assert.equal(back.state!.personal.active!.focusEnd,focusEnd);assert.equal(back.state!.room!.members.find(m=>m.id===back.id)!.seat,null);
  passed('disconnect grace releases seat; reconnect restores original cycle and spawn');
  await ok(second,'session:end');assert.equal(second.state!.personal.active,null);assert(back.state!.personal.active);
  await ok(second,'table:sit',{table:0,seat:1});await ok(second,'session:goal',{text:'Next draft',shared:false});await no(second,'session:ready');
  await reflectPending(second);assert(!JSON.stringify(back.state).includes('PRIVATE OBSTACLE'));
  passed('early ending affects only participant; pending reflection gate and privacy');
  await until(async()=>{await ok(back,'sync');return back.state!.personal.pending.some(p=>p.id===sessionId);},'focus completion');
  const ended=back.state!.personal.pending.find(p=>p.id===sessionId)!;
  assert.equal(ended.endReason,'completed');assert(ended.focusDurationMs<4600&&ended.focusDurationMs>0,`connected time ${ended.focusDurationMs}`);
  const foreign=await request('/sessions/'+sessionId+'/reflection',c.token,{goalOutcome:'achieved'},'PUT');assert.equal(foreign.status,400);
  await ok(back,'session:reflect',{sessionId,goalOutcome:'partial',obstacles:'PRIVATE OBSTACLE',nextSteps:'PRIVATE NEXT'});
  await ok(back,'session:reflect',{sessionId,goalOutcome:'achieved',obstacles:'edited private'});
  const history=(await request('/sessions/history?range=week',back.token)).data.sessions;assert.equal(history.filter((s:any)=>s.id===sessionId).length,1);assert.equal(history.find((s:any)=>s.id===sessionId).goalOutcome,'achieved');
  passed('focus ends before break; connected-only duration; authorized editable reflection without duplicates');
  const replacement=await connect(back.token,back.id);await until(()=>back.replaced,'tab replaced');assert(!back.socket.connected);assert.equal(replacement.state!.room!.members.filter(m=>m.id===back.id).length,1);
  passed('multi-tab takeover keeps one avatar and rejects old connection');
  const owner= [a,b,c,d,replacement].find(x=>x.id===replacement.state!.room!.owner&&x.socket.connected)!;
  const target=d.id===owner.id?c:d;
  await ok(owner,'room:kick',{userId:target.id});await no(target,'room:join',{code});assert.equal(target.state!.room,null);
  passed('owner kick removes membership and prevents rejoin');
  await until(()=>Date.now()>focusEnd+1700,'break elapsed');await reflectPending(replacement);
  await ok(replacement,'session:goal',{text:'Solo study',shared:false});await ok(replacement,'session:solo');assert.equal(replacement.state!.personal.active!.table,null);
  await no(replacement,'table:sit',{table:1,seat:2});await ok(replacement,'session:end');await reflectPending(replacement);
  passed('solo cycle and shared/solo mutual exclusion');
  // Capacity test with eight actual socket clients, then a ninth rejected.
  const clients=[];for(let i=0;i<9;i++)clients.push(await make(i+10));
  const capacityCode=(await ok(clients[0],'room:create')).code!;
  for(let i=1;i<8;i++)await ok(clients[i],'room:join',{code:capacityCode});
  await no(clients[8],'room:join',{code:capacityCode});assert.equal(clients[0].state!.room!.members.length,8);
  passed('eight simultaneous authenticated clients; ninth rejected');
  await ok(clients[0],'room:close');await no(clients[1],'room:join',{code:capacityCode});
  const emptyCode=(await ok(clients[1],'room:create')).code!;clients[1].socket.disconnect();await pause(2200);await no(clients[2],'room:join',{code:emptyCode});
  passed('room closure invalidates code; all-offline timeout closes room');
  // Durable records survive an actual process restart.
  for(const socket of sockets)socket.disconnect();await pause(100);server.kill();await new Promise(r=>server.once('exit',r));await start();
  const persisted=(await request('/sessions/history?range=week',replacement.token)).data.sessions;
  assert.equal(persisted.find((s:any)=>s.id===sessionId).goalOutcome,'achieved');
  passed('history and edited reflection survive backend restart');
  console.log(`\n${checks.length} integration groups passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{for(const s of sockets)s.disconnect();server?.kill();await pool.end();});
