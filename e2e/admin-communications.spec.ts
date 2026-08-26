import { expect, test } from '@playwright/test';

const API = 'http://localhost:3007/api/v1';
const jwt = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub:'admin-1', role:'admin', exp:Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.x`;
const admin = { id:'admin-1', firstName:'Ada', lastName:'Admin', email:'admin@veriq.ng', role:'admin', isActive:true };

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name:'veriq_authed', value:'1', domain:'127.0.0.1', path:'/' }, { name:'veriq_role', value:'admin', domain:'127.0.0.1', path:'/' }]);
  await page.addInitScript(({ jwt, admin }) => { localStorage.setItem('veriq_access_token', jwt); localStorage.setItem('veriq_refresh_token','refresh'); localStorage.setItem('veriq_user',JSON.stringify(admin)); }, { jwt, admin });
  await page.route(`${API}/auth/me`, route => route.fulfill({ json:{ data:admin } }));
  await page.route('**/chat/events**', route => route.fulfill({ status:204 }));
  await page.route(`${API}/notifications/unread-count`, route => route.fulfill({ json:{ data:{ unread:0 } } }));
  await page.route(`${API}/communications/campaigns?*`, route => route.fulfill({ json:{ data:[], meta:{ total:0,page:1,limit:20,pages:1 } } }));
  await page.route(`${API}/communications/analytics`, route => route.fulfill({ json:{ data:{ campaigns:0,targeted:0,sent:0,failed:0,uniqueOpens:0,uniqueClicks:0,deliveryRate:0,openRate:0,clickRate:0 } } }));
  await page.route(`${API}/communications/templates`, route => route.fulfill({ json:{ data:[] } }));
});

test('admin previews an audience before queuing a campaign', async ({ page }) => {
  let sent: any;
  await page.route(`${API}/communications/audience/preview`, route => route.fulfill({ json:{ data:{ count:42,sample:[] } } }));
  await page.route(`${API}/communications/campaigns`, async route => { sent = route.request().postDataJSON(); await route.fulfill({ status:201, json:{ data:{ id:'campaign-1' } } }); });
  await page.goto('/dashboard/admin/communications');
  await page.getByRole('button', { name:'New campaign' }).click();
  await page.getByLabel('Internal campaign name').fill('Rivers update');
  await page.getByLabel('Subject').fill('New street intelligence');
  await page.getByLabel('Message').fill('See the latest verified intelligence.');
  await page.getByRole('button', { name:'Preview audience' }).click();
  await expect(page.getByText('42 recipients matched')).toBeVisible();
  await page.getByRole('button', { name:'Queue campaign' }).click();
  await expect.poll(() => sent?.name).toBe('Rivers update');
  expect(sent.audienceType).toBe('users');
  expect(sent.sendNow).toBe(true);
});

test('admin can maintain reusable templates', async ({ page }) => {
  let payload: any;
  await page.route(`${API}/communications/templates`, async route => {
    if (route.request().method() === 'POST') { payload = route.request().postDataJSON(); await route.fulfill({ status:201, json:{ data:{ id:'t1',...payload } } }); }
    else await route.fulfill({ json:{ data:[] } });
  });
  await page.goto('/dashboard/admin/communications');
  await page.getByRole('button', { name:'templates' }).click();
  await page.getByRole('button', { name:'Add template' }).click();
  await page.getByLabel('Template name').fill('Property Expiry Reminder');
  await page.getByLabel('Subject').fill('Please refresh your listing');
  await page.getByLabel('Message').fill('Your listing needs an availability update.');
  await page.getByRole('button', { name:'Save template' }).click();
  await expect.poll(() => payload?.name).toBe('Property Expiry Reminder');
});
