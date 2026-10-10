const { chromium, expect } = require('@playwright/test');
const path=require('node:path');
const fs=require('node:fs/promises');
const url=process.env.TEST_WEB_URL||'http://127.0.0.1:5173';
const artifacts=path.resolve(__dirname,'../artifacts');
(async()=>{
 await fs.mkdir(artifacts,{recursive:true});
 const browser=await chromium.launch({headless:false,channel:process.env.PW_CHANNEL||'chrome'});
 const errors=[];
 try{
  const ca=await browser.newContext({viewport:{width:1440,height:1000}}),cb=await browser.newContext({viewport:{width:1440,height:1000}});
  const a=await ca.newPage(),b=await cb.newPage();
  for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  await a.goto(url);await expect(a.getByRole('heading',{name:'ยินดีต้อนรับกลับมา'})).toBeVisible();
  await a.screenshot({path:path.join(artifacts,'01-login.png'),fullPage:true});
  // Fresh isolated demo accounts, registered through the visible UI.
  async function register(page,name,preset){
   await page.goto(url);await page.getByRole('button',{name:'สร้างบัญชี',exact:true}).click();
   await page.getByLabel('ชื่อเล่น').fill(name);
   await page.getByRole('button',{name:`อวาตาร์ ${preset}`,exact:true}).click();
   await page.getByLabel('อีเมล',{exact:true}).fill(`${name.toLowerCase()}-${Date.now()}@ui.connecta.test`);
   await page.getByLabel('รหัสผ่าน',{exact:true}).fill('Demo-only-ui-123');
   await page.getByRole('button',{name:'สร้างบัญชี',exact:false}).last().click();
   await expect(page.getByRole('button',{name:/สร้างห้องอ่านหนังสือ/})).toBeEnabled();
  }
  await register(a,'Maple',1);await register(b,'Fern',3);
  await a.getByRole('button',{name:/สร้างห้องอ่านหนังสือ/}).click();
  const code=await a.getByTestId('room-code').textContent();
  await b.getByLabel('รหัสห้อง 6 ตัว').fill(code);await b.getByRole('button',{name:'เข้าห้อง',exact:true}).click();
  await expect(b.locator('canvas')).toBeVisible();await expect(a.getByText('2 คนอยู่ในห้อง')).toBeVisible();
  await a.locator('canvas').click({position:{x:300,y:450}});await a.keyboard.down('a');await a.waitForTimeout(450);await a.keyboard.up('a');
  await a.screenshot({path:path.join(artifacts,'02-world.png'),fullPage:true});
  async function sit(page,seat){await page.getByRole('button',{name:/01 Fern table/}).click();await page.getByRole('button',{name:new RegExp(`ที่นั่ง ${seat} ว่าง`)}).click();}
  await sit(a,1);await sit(b,2);
  async function goal(page,text,share){await page.getByRole('button',{name:'＋ ตั้งเป้าหมาย'}).click();await page.getByLabel('ฉันตั้งใจจะ…').fill(text);if(share)await page.getByLabel('แชร์ข้อความเป้าหมายกับสมาชิกโต๊ะ').check();await page.getByRole('button',{name:'บันทึกเป้าหมาย',exact:true}).click();await page.getByRole('button',{name:'ฉันพร้อมแล้ว'}).click();}
  await goal(a,'อ่าน Database บทที่ 4 ให้จบ',true);await goal(b,'เขียนบทนำรายงานหนึ่งย่อหน้า',false);
  await a.getByRole('button',{name:'เปิดแชตห้อง'}).click();
  await a.getByRole('button',{name:'เริ่มรอบร่วมกัน'}).click();
  await expect(a.getByRole('button',{name:'เปิดแชตห้อง'})).toBeVisible();
  await expect(b.getByRole('button',{name:'ยุติรอบและลุกจากโต๊ะ'})).toBeVisible();
  await a.screenshot({path:path.join(artifacts,'03-focus.png'),fullPage:true});
  await b.getByRole('button',{name:'เปิดแชตห้อง'}).click();await b.getByLabel('ข้อความแชต').fill('ตั้งใจไปด้วยกันนะ');await b.getByRole('button',{name:'ส่งข้อความ'}).click();
  await expect(a.getByTestId('unread')).toHaveText('1');await a.getByRole('button',{name:'เปิดแชตห้อง'}).click();await expect(a.getByText('ตั้งใจไปด้วยกันนะ')).toBeVisible();await expect(a.getByTestId('unread')).toHaveCount(0);
  await a.screenshot({path:path.join(artifacts,'04-chat.png'),fullPage:true});
  await a.getByRole('button',{name:'หุบแผงแชต'}).click();await a.reload();await expect(a.getByRole('button',{name:'ยุติรอบและลุกจากโต๊ะ'})).toBeVisible();
  await b.getByRole('button',{name:'หุบแผงแชต'}).click();
  await b.getByRole('button',{name:'ยุติรอบและลุกจากโต๊ะ'}).click();await b.getByRole('button',{name:'ยืนยัน',exact:true}).click();
  await b.getByRole('button',{name:/บันทึกผลรอบที่ผ่านมา/}).click();await b.getByLabel('ผลเป้าหมาย',{exact:true}).selectOption('partial');await b.getByLabel('อุปสรรคที่พบ').fill('ต้องค้นข้อมูลเพิ่ม');await b.getByLabel('สิ่งที่จะทำต่อ').fill('เติมตัวอย่างในบทนำ');await b.getByRole('button',{name:'บันทึกผล',exact:true}).click();
  await expect(a.getByRole('button',{name:'ยุติรอบและลุกจากโต๊ะ'})).toBeVisible();
  await b.getByRole('button',{name:/ประวัติของฉัน/}).click();await expect(b.getByRole('heading',{name:'เขียนบทนำรายงานหนึ่งย่อหน้า'})).toBeVisible();await expect(b.getByText(/ยุติก่อนเวลา · เวลาเข้าร่วม/)).toBeVisible();
  await b.screenshot({path:path.join(artifacts,'05-history.png'),fullPage:true});
  await b.getByRole('button',{name:'แก้ไขผล'}).click();await b.getByLabel('ผลเป้าหมาย',{exact:true}).selectOption('achieved');await b.getByRole('button',{name:'บันทึกผล',exact:true}).click();
  await a.setViewportSize({width:1280,height:800});await a.screenshot({path:path.join(artifacts,'06-desktop-1280.png'),fullPage:true});
  const replacement=await ca.newPage();await replacement.goto(url);await expect(a.getByText('บัญชีนี้เปิดใช้งานจากแท็บอื่นแล้ว')).toBeVisible();await expect(replacement.locator('canvas')).toBeVisible();
  await replacement.getByRole('button',{name:/สมาชิกและห้อง/}).click();await replacement.getByRole('button',{name:'ปิดห้องสำหรับทุกคน'}).click();await replacement.getByRole('button',{name:'ยืนยัน',exact:true}).click();await expect(replacement.getByRole('button',{name:/สร้างห้องอ่านหนังสือ/})).toBeVisible();
  expect(errors).toEqual([]);
  console.log('PASS browser: registration, two real users, movement, seats, goals, readiness, shared focus, chat collapse/unread, refresh, early end, reflection editing, history, multi-tab, room close. No browser exceptions.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
