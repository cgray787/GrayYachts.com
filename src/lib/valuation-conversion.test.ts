import {describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html = readFileSync('public/sell.html', 'utf8');
const submitScript = html.slice(html.indexOf('/* ---------- submit ---------- */'), html.indexOf('function done(name)'));

function formHarness(ok = true, tag: unknown = vi.fn()) {
  let submit: (event: {preventDefault(): void}) => Promise<void>;
  const fields = new Map<string, any>();
  const values: Record<string, string> = {fname: 'Test User', email: 'test@example.invalid', phone: '2065550134', hp: ''};
  const get = (id: string) => {
    if (!fields.has(id)) fields.set(id, {
      value: values[id] ?? '', classList: {toggle: vi.fn(), remove: vi.fn(), add: vi.fn()},
      setAttribute: vi.fn(), focus: vi.fn(), scrollIntoView: vi.fn(),
      addEventListener: (_name: string, handler: typeof submit) => {submit = handler;},
    });
    return fields.get(id);
  };
  const done = vi.fn();
  const fetch = vi.fn().mockResolvedValue({ok, status: ok ? 200 : 500});
  runInNewContext(submitScript, {
    $: get, gtag: tag, done, fetch, CONFIG: {LEAD_ENDPOINT: '/api/valuation'},
    answers: {}, attribution: {}, shots: [], console: {error: vi.fn()},
  });
  return {get, done, fetch, tag: tag as ReturnType<typeof vi.fn>, submit: () => submit({preventDefault() {}})};
}

describe('accepted valuation conversion', () => {
  it('reports only after the API accepts a valid form, once per page', async () => {
    const form = formHarness();
    expect(form.tag).not.toHaveBeenCalled();
    await form.submit();
    await form.submit();
    expect(form.tag).toHaveBeenCalledExactlyOnceWith('event', 'conversion', {send_to: 'AW-18507545875/g7QOCIjdrZ4dEJP6ivlE'});
    expect(form.done).toHaveBeenCalled();
  });
  it('does not count rejected requests as leads', async () => {
    const form = formHarness(false);
    await form.submit();
    expect(form.tag).not.toHaveBeenCalled();
    expect(form.done).not.toHaveBeenCalled();
    expect(form.get('submit').disabled).toBe(false);
  });
  it('does not count invalid forms or send them to the API', async () => {
    const form = formHarness();
    form.get('email').value = 'invalid';
    await form.submit();
    expect(form.fetch).not.toHaveBeenCalled();
    expect(form.tag).not.toHaveBeenCalled();
  });
  it.each([undefined, () => {throw new Error('analytics blocked');}])('keeps successful forms working if tracking is unavailable', async (tag) => {
    const form = formHarness(true, tag === undefined ? null : tag);
    await form.submit();
    expect(form.done).toHaveBeenCalledWith('Test User');
  });
});
