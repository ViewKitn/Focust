// Mechanical packing of generated art: transparent crop, common character scale,
// nearest-neighbour sampling, fixed foot anchors. Originals remain untouched.
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'assets/exported');
const names=['desk','chair-back','chair-front','bookshelf','goal-board','summary-board','sofa','plant','lamp','tea-table','window','book-cart','floor','wall','flowers','rug'];
const rows=[{y:0,h:400,x:[0,400,665,942,1254]},{y:400,h:292,x:[0,350,635,948,1254]},{y:692,h:278,x:[0,320,625,965,1254]},{y:970,h:284,x:[0,320,625,915,1254]}];
const sizes=[[88,72],[24,28],[24,28],[48,56],[40,28],[40,28],[64,36],[28,40],[24,48],[40,28],[56,48],[32,36],[16,16],[16,32],[20,24],[80,48]];
async function crop(file,rect) {
  const buffer=await sharp(file).extract(rect).png().toBuffer();
  const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=info.width,y0=info.height,x1=0,y1=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return {buffer:await sharp(buffer).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).png().toBuffer(),width:x1-x0+1,height:y1-y0+1};
}
async function main(){
  await fs.mkdir(output,{recursive:true});
  const manifest={environment:{},characters:{},grid:16,scale:2,anchor:'bottom-center',source:'Built-in image_gen; original source PNGs in assets/source'};
  for(let i=0;i<16;i++){
    const r=rows[Math.floor(i/4)],c=i%4;
    const art=await crop(path.join(root,'assets/source/environment.png'),{left:r.x[c],top:r.y,width:r.x[c+1]-r.x[c],height:r.h});
    await sharp(art.buffer).resize(sizes[i][0],sizes[i][1],{fit:'fill',kernel:'nearest'}).png().toFile(path.join(output,names[i]+'.png'));
    manifest.environment[names[i]]={file:names[i]+'.png',width:sizes[i][0],height:sizes[i][1],origin:[.5,1]};
  }
  const file=path.join(root,'assets/source/characters.png');
  for(let row=0;row<4;row++){
    const frames=[];
    for(let col=0;col<10;col++) frames.push(await crop(file,{left:Math.round(col*1983/10),top:Math.round(row*793/4),width:Math.round((col+1)*1983/10)-Math.round(col*1983/10),height:Math.round((row+1)*793/4)-Math.round(row*793/4)}));
    const scale=29/Math.max(...frames.slice(0,8).map(f=>f.height));
    const composites=[];
    for(let col=0;col<10;col++){
      const f=frames[col],w=Math.round(f.width*scale),h=Math.round(f.height*scale);
      composites.push({input:await sharp(f.buffer).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left:col*32+Math.round((32-w)/2),top:31-h});
    }
    await sharp({create:{width:320,height:32,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toFile(path.join(output,`preset-${row+1}.png`));
    manifest.characters[`preset-${row+1}`]={file:`preset-${row+1}.png`,frameWidth:32,frameHeight:32,feet:[16,31],animations:{down:[0,1],left:[2,3],right:[4,5],up:[6,7],sitDown:[8],sitUp:[9]}};
  }
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));
  const publicDir=path.join(root,'apps/web/public/assets');await fs.mkdir(publicDir,{recursive:true});
  for(const name of await fs.readdir(output))await fs.copyFile(path.join(output,name),path.join(publicDir,name));
  console.log('Exported 16 environment sprites, four 10-frame character sheets and manifest.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
