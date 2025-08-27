/**
 * @jest-environment jsdom
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = path.resolve(__dirname, '../script.js');
let scriptContent;

beforeAll(() => {
  scriptContent = fs.readFileSync(scriptPath, 'utf8');
});

function loadDom() {
  document.body.innerHTML = `
  <div id="form-area"></div>
  <form id="quote-form">
    <div id="step-1" class="form-step">
      <select name="bedrooms"><option value="2">2</option></select>
      <select name="bathrooms"><option value="1">1</option></select>
      <select name="property-type"><option value="House">House</option></select>
      <input name="property-address" />
      <input name="move-date" type="date" />
      <button class="next-step">Next</button>
    </div>
    <div id="step-2" class="form-step">
      <input type="checkbox" name="addons[]" value="Oven" />
      <button class="prev-step">Back</button>
      <button class="next-step">Next</button>
    </div>
    <div id="step-3" class="form-step">
      <input name="full-name" aria-describedby="name-error" required />
      <span id="name-error" style="display:none"></span>
      <input name="email" type="email" aria-describedby="email-error" required />
      <span id="email-error" style="display:none"></span>
      <input name="phone" />
      <textarea name="special-requests"></textarea>
      <button class="prev-step">Back</button>
      <button class="next-step">Next</button>
    </div>
    <div id="step-4" class="form-step">
      <div id="review-property-summary"></div>
      <div id="review-address"></div>
      <div id="review-name"></div>
      <div id="review-email"></div>
      <div id="review-phone"></div>
      <div id="review-move-date"></div>
      <ul id="review-services"></ul>
      <div id="review-requests-container"><span id="review-requests"></span></div>
      <button type="submit">Submit</button>
      <button class="prev-step">Back</button>
    </div>
  </form>
  <div id="success-message"></div>
  <div id="form-error-message"></div>
  <div class="step-indicator"><div class="step"></div><div class="step"></div><div class="step"></div><div class="step"></div></div>
  <div id="progress"></div>
  <div id="current-step-display"></div>
  <button id="new-quote-btn"></button>
  `;
  const form = document.getElementById('quote-form');
  ['bedrooms','bathrooms','property-type','property-address','move-date','full-name','email','phone','special-requests'].forEach(name => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) form[name] = el;
  });
}

function runScript() {
  jest.resetModules();
  eval(scriptContent);
  document.dispatchEvent(new Event('DOMContentLoaded'));
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('Quote Form User Flow', () => {
  beforeEach(() => {
    loadDom();
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ suburb: 'Redbank Plains' })
    }));
  });

  test('next and back buttons navigate steps', async () => {
    await runScript();
    const form = document.getElementById('quote-form');
    form.querySelector('#step-1 .next-step').click();
    expect(document.getElementById('step-2').classList.contains('active')).toBe(true);
    form.querySelector('#step-2 .prev-step').click();
    expect(document.getElementById('step-1').classList.contains('active')).toBe(true);
  });

  test('validation prevents progressing past step 3', async () => {
    await runScript();
    const form = document.getElementById('quote-form');
    form.querySelector('#step-1 .next-step').click();
    form.querySelector('#step-2 .next-step').click();
    form.querySelector('#step-3 .next-step').click();
    expect(document.getElementById('step-3').classList.contains('active')).toBe(true);
    expect(document.getElementById('name-error').style.display).toBe('block');
    expect(document.getElementById('email-error').style.display).toBe('block');
  });

  test('review step displays entered data', async () => {
    await runScript();
    const form = document.getElementById('quote-form');
    form.querySelector('[name="bedrooms"]').value = '2';
    form.querySelector('[name="bathrooms"]').value = '1';
    form.querySelector('[name="property-type"]').value = 'House';
    form.querySelector('[name="property-address"]').value = '123 Main St';
    form.querySelector('[name="move-date"]').value = '2024-08-01';
    form.querySelector('#step-1 .next-step').click();
    form.querySelector('input[name="addons[]"]').checked = true;
    form.querySelector('#step-2 .next-step').click();
    form.querySelector('[name="full-name"]').value = 'Jane Doe';
    form.querySelector('[name="email"]').value = 'jane@example.com';
    form.querySelector('[name="phone"]').value = '0405779420';
    form.querySelector('[name="special-requests"]').value = 'No carpets';
    form.querySelector('#step-3 .next-step').click();
    expect(document.getElementById('step-4').classList.contains('active')).toBe(true);
    expect(document.getElementById('review-name').textContent).toBe('Jane Doe');
    expect(document.getElementById('review-email').textContent).toBe('jane@example.com');
    expect(document.getElementById('review-property-summary').textContent).toContain('2 Bed');
    expect(document.getElementById('review-services').textContent).toContain('Oven');
  });
});
