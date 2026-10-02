import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];const results=[];
await mkdir('docs/screenshots',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},colorScheme:'light'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://localhost:3000');await expect(page.locator('.post')).toHaveCount(5);await page.screenshot({path:'docs/screenshots/desktop.png',fullPage:false});
 for(const width of [320,375,390,768,1024,1440]){await page.setViewportSize({width,height:900});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw new Error(`Horizontal overflow at ${width}`);results.push(`No horizontal overflow at ${width}px`);}
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.screenshot({path:'docs/screenshots/mobile.png',fullPage:false});
 await page.emulateMedia({colorScheme:'dark'});await page.waitForTimeout(250);await page.screenshot({path:'docs/screenshots/mobile-dark.png',fullPage:false});await page.locator('.mobile-account').click();await expect(page.locator('#dialog')).toHaveAccessibleName('Saul Goodman');await page.locator('[data-action=theme][data-theme=light]').click();await page.locator('#dialog [data-action=compose]').click();const contrast=await page.locator('#compose-form .primary').evaluate(el=>({color:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));if(contrast.color!=='rgb(255, 255, 255)')throw new Error('Forced light theme button contrast regression');await page.keyboard.press('Escape');await page.emulateMedia({colorScheme:'light'});results.push('Mobile account access, named dialogs, forced-light contrast on a dark device passed');
 await page.locator('.composer-start button').click();await page.locator('#post-text').fill('I automated the meeting about automating meetings. <script>window.hacked=true</script>');await page.locator('#compose-form button[type=submit]').click();
 await expect(page.locator('.post')).toHaveCount(6);const own=page.locator('.post').first();await expect(own).toContainText('Saul Goodman');await expect(own.locator('[data-ad-slot]')).toHaveCount(1);await expect(own.locator('.comment-list')).toContainText('Walter White',{timeout:10000});
 await own.locator('[data-action=comment]').first().click();await expect(own.locator('.comments')).toBeHidden();await expect(own.locator('.comment-list')).toContainText('Jesse Pinkman',{timeout:10000});await expect(own.locator('.comments')).toBeHidden();await own.locator('[data-action=comment]').first().click();results.push('Incoming simulated replies respect explicitly collapsed comments');
 const count=await own.locator('[data-like-count]').innerText();if(Number(count.replaceAll(',',''))<1)throw new Error('Simulation did not increase reactions');if(await page.evaluate(()=>window.hacked))throw new Error('Unsafe post content');
 await page.screenshot({path:'docs/screenshots/viral-post.png',fullPage:false});
 await own.locator('[data-action=like]').click();await expect(own.locator('[data-action=like]')).toHaveAttribute('aria-pressed','true');
 await own.locator('.comment-form input').fill('This changed my entire business model.');await own.locator('.comment-form button').click();await expect(own).toContainText('This changed my entire business model.');
 await own.locator('[data-action=save]').click();await page.reload();await expect(page.locator('.post')).toHaveCount(6);await expect(page.locator('.post').first()).toContainText('This changed my entire business model.');results.push('Posting, escaping, simulated live reactions and comments, likes, saves and reload persistence passed');
 await page.locator('#search').fill('nonexistent-unique-query');await expect(page.locator('#empty-state')).toBeVisible();await page.locator('#search').fill('');
 await page.locator('.primary-nav [data-action=network]').click();await expect(page.locator('#alternate-view')).toContainText('Walter White');await page.locator('.primary-nav [data-action=jobs]').click();await expect(page.locator('#alternate-view')).toContainText('Chief AI Whisperer');await page.locator('.primary-nav [data-action=home]').click();
 await page.locator('[data-filter="Tech gospel"]').click();await expect(page.locator('.post:visible')).toHaveCount(2);results.push('Search, empty state, filters, navigation passed');
 await page.locator('.primary-nav [data-action=messages]').click();await page.locator('#message-input').fill('Yeah, science');await page.locator('#message-form button').click();await expect(page.locator('.chat-thread')).toContainText('Let’s circle back');await page.keyboard.press('Escape');await expect(page.locator('#dialog')).not.toBeVisible();
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto('http://localhost:3000');await expect(nojs.locator('.post')).toHaveCount(5);results.push('JavaScript-free server-rendered feed passed');await nojs.close();
 const response=await page.request.post('http://localhost:3000/api/posts/preview',{data:{text:''}});if(response.status()!==400)throw new Error('Invalid post not rejected');
 if(errors.length)throw new Error(errors.join('\n'));
 results.push('No browser console or runtime errors');
 await writeFile('docs/browser-results.json',JSON.stringify({date:new Date().toISOString(),results},null,2));console.log(results.join('\n'));
}finally{await browser.close();}
