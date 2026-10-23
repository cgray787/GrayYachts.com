import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const html=readFileSync('public/sell.html','utf8'),js=readFileSync('public/measurement.js','utf8');
test('consent, attribution, seven steps, failed retry, accepted conversion and PII exclusion',async({page})=>{
  const submissions:Record<string,unknown>[]=[];
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/sell') return route.fulfill({contentType:'text/html',body:html});
    if(url.pathname==='/measurement.js') return route.fulfill({contentType:'application/javascript',body:js});
    if(url.pathname==='/api/measurement/config') return route.fulfill({json:{ga4MeasurementId:'G-TEST123'}});
    if(url.pathname==='/api/valuation'){
      submissions.push(route.request().postDataJSON());
      return submissions.length===1 ? route.fulfill({status:502,json:{ok:false}}) : route.fulfill({json:{ok:true,accepted:true,lead_id:'c07005de-7cda-45eb-8b75-5d32f057763b'}});
    }
    return route.fulfill({body:''});
  });
  await page.goto('http://127.0.0.1:4321/sell?utm_source=chatgpt&utm_medium=paid&utm_campaign=sell_your_yacht&utm_content=seller_direct&oppref=test-click&email=private@example.test');
  await expect(page.getByRole('button',{name:'Allow analytics',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>!!(window as unknown as {dataLayer:unknown}).dataLayer)).toBe(false);
  await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
  await page.locator('#start').click();
  for(let step=0;step<7;step++){
    await expect(page.locator('#stepTxt')).toHaveText(`Question ${step+1} of 7`);
    if(step===3) await page.locator('#qChips button').first().click();
    else if(step===4){await page.locator('#qInput').fill('2018 Test Vessel');await page.locator('#qNext').click();}
    else await page.locator('#qOpts button').first().click();
  }
  await expect(page.locator('#s-gate')).toHaveClass(/on/);
  await page.locator('#fname').fill('Private Owner');await page.locator('#email').fill('owner@example.test');await page.locator('#phone').fill('2065550123');
  await page.locator('#submit').click();
  await expect(page.locator('#e-form')).toHaveClass(/on/);
  const events=()=>page.evaluate(()=>Array.from((window as unknown as {dataLayer: IArguments[]}).dataLayer||[]).map(a=>Array.from(a)));
  expect((await events()).filter(e=>e[1]==='generate_lead')).toHaveLength(0);
  await page.locator('#submit').click();await expect(page.locator('#s-done')).toHaveClass(/on/);
  const emitted=await events();
  expect(emitted.filter(e=>e[1]==='generate_lead')).toHaveLength(1);
  expect(emitted.filter(e=>e[1]==='questionnaire_step_complete')).toHaveLength(7);
  const serialized=JSON.stringify(emitted);
  for(const pii of ['Private Owner','owner@example.test','2065550123','2018 Test Vessel','private@example.test','test-click']) expect(serialized).not.toContain(pii);
  expect(submissions[0].submission_id).toBe(submissions[1].submission_id);
  expect(submissions[1]).toMatchObject({utm_source:'chatgpt',utm_campaign:'sell_your_yacht',utm_content:'seller_direct',oppref:'test-click'});
  await page.reload();
  const context=await page.evaluate(()=>(window as unknown as {GYMeasurement:{context:()=>unknown}}).GYMeasurement.context());
  expect(context).toMatchObject({first_touch:{utm_source:'chatgpt'},last_touch:{utm_source:'chatgpt'}});
});
test('declining analytics keeps tracking off without blocking the questionnaire',async({page})=>{
  await page.route('**/*',route=>{
    const path=new URL(route.request().url()).pathname;
    return route.fulfill(path==='/sell'?{contentType:'text/html',body:html}:path==='/measurement.js'?{contentType:'application/javascript',body:js}:path==='/api/measurement/config'?{json:{ga4MeasurementId:'G-TEST123'}}:{body:''});
  });
  await page.goto('http://127.0.0.1:4321/sell');
  await page.getByRole('button',{name:'Decline',exact:true}).click();await page.locator('#start').click();
  await expect(page.locator('#stepTxt')).toHaveText('Question 1 of 7');
  expect(await page.evaluate(()=>!!(window as unknown as {dataLayer:unknown}).dataLayer)).toBe(false);
});
