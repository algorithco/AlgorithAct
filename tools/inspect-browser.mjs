import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('console',msg=>{if(msg.type()==='error'||msg.type()==='warning')console.log(msg.type(),msg.text());});
page.on('pageerror',error=>console.log('PAGE ERROR:',error.stack));
await page.goto('http://127.0.0.1:5173/');
await page.waitForTimeout(3000);
console.log((await page.locator('body').innerText()).slice(0,5000));
await mkdir('.qa',{recursive:true});await page.screenshot({path:'.qa/inspect.png',fullPage:true});
await browser.close();
