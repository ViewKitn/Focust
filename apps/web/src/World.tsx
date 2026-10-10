import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WORLD, TABLE_POINTS, BOARDS, walkable } from '@connecta-focus/shared';
import type { Person, Position, RoomView } from '@connecta-focus/shared';

interface Props { room: RoomView; userId:string; locked:boolean; move:(p:Position)=>void; interact:(kind:string,index?:number)=>void }
export default function World(props:Props){
  const host=useRef<HTMLDivElement>(null),live=useRef(props);live.current=props;
  useEffect(()=>{
    if(!host.current)return;
    const keys=new Set<string>();
    const isTyping=()=>{const e=document.activeElement as HTMLElement;return !!e&&(e.matches('input,textarea,select,button')||e.isContentEditable)||!!document.querySelector('[role=dialog]');};
    const down=(e:KeyboardEvent)=>{if(!isTyping()&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(e.key.toLowerCase())){e.preventDefault();keys.add(e.key.toLowerCase());}};
    const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    const blur=()=>keys.clear();
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
    class StudyScene extends Phaser.Scene {
      players=new Map<string,{sprite:Phaser.GameObjects.Sprite;label:Phaser.GameObjects.Text;ring:Phaser.GameObjects.Ellipse}>();
      local:Position={...WORLD.spawn,direction:'up',isMoving:false};lastEmit=0;wasSeated=false;hint!:Phaser.GameObjects.Text;
      preload(){
        for(const name of ['desk','chair-back','chair-front','bookshelf','goal-board','summary-board','sofa','plant','lamp','tea-table','window','book-cart','floor','wall','flowers','rug'])this.load.image(name,`/assets/${name}.png`);
        for(let i=1;i<=4;i++)this.load.spritesheet(`preset-${i}`,`/assets/preset-${i}.png`,{frameWidth:32,frameHeight:32});
      }
      create(){
        const art=(name:string,x:number,y:number,scale=2,depth=y)=>this.add.image(x,y,name).setOrigin(.5,1).setScale(scale).setDepth(depth);
        // The room uses a 16px native tile grid at 2x nearest-neighbour display.
        this.add.tileSprite(400,328,768,496,'floor').setTileScale(2).setDepth(0);
        this.add.rectangle(400,72,768,112,0xebe6d8).setStrokeStyle(4,0x696e5c).setDepth(1);
        for(let x=32;x<784;x+=32)art('wall',x,132,2,2);
        this.add.rectangle(19,330,10,466,0x5f6557).setDepth(2);this.add.rectangle(781,330,10,466,0x5f6557).setDepth(2);
        this.add.rectangle(400,575,768,12,0x6e6957).setDepth(2);
        art('window',400,99,1.7,3);
        art('bookshelf',96,130,2,130);art('bookshelf',184,130,2,130);
        art('bookshelf',620,130,2,130);art('bookshelf',708,130,2,130);
        art('goal-board',320,126,1.55,130);art('summary-board',480,126,1.55,130);
        art('plant',82,208,1.7);art('plant',718,208,1.7);
        art('rug',248,384,2.5,3);art('rug',552,384,2.5,3);
        TABLE_POINTS.forEach((p,i)=>{
          art('desk',p.x,p.y+78,2,p.y+15);
          this.add.text(p.x,p.y+104,i?'02  ·  OAK TABLE':'01  ·  FERN TABLE',{fontFamily:'monospace',fontSize:'10px',color:'#706a57',letterSpacing:1}).setOrigin(.5).setDepth(2);
        });
        art('rug',160,527,2,3);art('sofa',141,488,2);art('tea-table',145,542,1.4);art('lamp',55,475,1.5);art('flowers',241,485,1.4);
        art('book-cart',654,484,2);art('chair-front',710,488,1.7);art('plant',752,532,1.8);
        this.add.text(400,585,'C O N N E C T A   /   C A M P U S   L I B R A R Y',{fontFamily:'monospace',fontSize:'9px',color:'#8b8875'}).setOrigin(.5).setDepth(1000);
        this.hint=this.add.text(400,551,'',{fontFamily:'Tahoma',fontSize:'13px',color:'#ffffff',backgroundColor:'#315542',padding:{x:12,y:6}}).setOrigin(.5).setDepth(2000);
        const m=live.current.room.members.find(m=>m.id===live.current.userId);if(m)this.local={...m.position};
      }
      update(time:number,delta:number){
        const {room,userId,locked}=live.current, me=room.members.find(m=>m.id===userId);if(!me)return;
        if(me.seat||this.wasSeated){this.local={...me.position};this.wasSeated=!!me.seat;}
        let dx=0,dy=0;
        if(!locked&&!me.seat&&!isTyping()){
          dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
          dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
        }
        const length=Math.hypot(dx,dy)||1, step=WORLD.speed*Math.min(delta,40)/1000;
        const nx=this.local.x+dx/length*step,ny=this.local.y+dy/length*step;
        if(walkable(nx,this.local.y))this.local.x=nx;if(walkable(this.local.x,ny))this.local.y=ny;
        if(dx)this.local.direction=dx<0?'left':'right';else if(dy)this.local.direction=dy<0?'up':'down';
        const moving=!!(dx||dy),changed=this.local.isMoving!==moving;this.local.isMoving=moving;
        if(!me.seat&&!locked&&(time-this.lastEmit>90||changed)){live.current.move({...this.local});this.lastEmit=time;}
        for(const [id,item] of this.players)if(!room.members.some(m=>m.id===id)){item.sprite.destroy();item.label.destroy();item.ring.destroy();this.players.delete(id);}
        for(const m of room.members){
          let item=this.players.get(m.id);
          if(!item){item={sprite:this.add.sprite(0,0,m.avatar).setOrigin(.5,1).setScale(2),label:this.add.text(0,0,'',{fontFamily:'Tahoma',fontSize:'11px',color:'#263c32',backgroundColor:'#f6f2e6e8',padding:{x:5,y:3}}).setOrigin(.5),ring:this.add.ellipse(0,0,34,12,0x3f6555,.18)};this.players.set(m.id,item);}
          const pos=m.id===userId?this.local:m.position;
          let frame=({down:0,left:2,right:4,up:6})[pos.direction];
          if(m.seat)frame=m.seat.index<2?8:9;else if(pos.isMoving)frame+=Math.floor(time/180)%2;
          item.sprite.setTexture(m.avatar,frame).setPosition(pos.x,pos.y).setDepth(pos.y).setAlpha(m.connected?1:.4);
          item.ring.setPosition(pos.x,pos.y-2).setDepth(pos.y-1);
          const status=m.status==='focusing'?' · โฟกัส':m.status==='ready'?' · พร้อม':m.status==='break'?' · พัก':'';
          item.label.setText(m.nickname+(m.id===userId?' (คุณ)':'')+status).setPosition(pos.x,pos.y-66).setDepth(1500);
        }
        const near=[...TABLE_POINTS.map((p,i)=>({...p,kind:'table',index:i})),...BOARDS.map(p=>({...p,kind:p.action,index:0}))].find(p=>Math.hypot(this.local.x-p.x,this.local.y-p.y)<112);
        this.hint.setVisible(!!near&&!me.seat&&!locked);
        if(near)this.hint.setText('E  ·  '+(near.kind==='table'?'เลือกที่นั่ง':near.kind==='goal'?'ตั้งเป้าหมาย':'ดูประวัติ'));
        if(keys.has('e')){keys.delete('e');if(near&&!isTyping()&&!locked)live.current.interact(near.kind,near.index);}
      }
    }
    const game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:800,height:608,backgroundColor:'#d6d9c9',pixelArt:true,roundPixels:true,scene:StudyScene,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
    return()=>{game.destroy(true);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
  },[props.room.id]);
  return <div ref={host} className="world-canvas" aria-label="โลกห้องสมุด 2D ใช้ WASD เดิน และ E โต้ตอบ"/>;
}
