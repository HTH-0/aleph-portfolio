(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const lockedPanel = $('private-locked');
  const unlockedPanel = $('private-unlocked');
  const authMessage = $('auth-message');
  const currentUsernameEl = $('current-username');
  const itemsContainer = $('private-items');
  const passkeyListEl = $('passkey-list');

  function showMessage(text, isError) {
    authMessage.textContent = text;
    authMessage.classList.toggle('auth-message-error', Boolean(isError));
  }

  async function api(path, options) {
    const res = await fetch(path, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      // no JSON body (e.g. 405) -- fine, callers only need res.ok in that case
    }
    return { ok: res.ok, status: res.status, body };
  }

  // ---------- Locked / unlocked rendering ----------

  async function renderUnlocked(username) {
    lockedPanel.hidden = true;
    unlockedPanel.hidden = false;
    currentUsernameEl.textContent = username;
    await Promise.all([loadPrivateItems(), loadPasskeys()]);
  }

  function renderLocked() {
    unlockedPanel.hidden = true;
    lockedPanel.hidden = false;
    itemsContainer.innerHTML = '';
    passkeyListEl.innerHTML = '';
  }

  async function loadPrivateItems() {
    const { ok, body } = await api('/api/private-items');
    if (!ok) return;
    itemsContainer.innerHTML = '';
    for (const item of body.items) {
      const card = document.createElement('article');
      card.className = 'private-item';
      const h4 = document.createElement('h4');
      h4.textContent = item.title;
      const p = document.createElement('p');
      p.textContent = item.body;
      card.append(h4, p);
      itemsContainer.append(card);
    }
  }

  async function loadPasskeys() {
    const { ok, body } = await api('/api/passkeys');
    if (!ok) return;
    passkeyListEl.innerHTML = '';
    for (const pk of body.passkeys) {
      const li = document.createElement('li');
      li.className = 'passkey-row';

      const info = document.createElement('span');
      const date = new Date(pk.created_at).toLocaleDateString('ko-KR');
      info.textContent = `${pk.nickname} · 등록일 ${date}`;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'button button-secondary passkey-delete';
      delBtn.textContent = '삭제';
      delBtn.addEventListener('click', () => deletePasskey(pk.id));

      li.append(info, delBtn);
      passkeyListEl.append(li);
    }
  }

  async function deletePasskey(id) {
    const { ok, body } = await api(`/api/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!ok) {
      if (body?.error === 'cannot_delete_last_passkey') {
        showMessage('마지막 남은 패스키는 삭제할 수 없습니다. 새 패스키를 먼저 등록하세요.', true);
      } else {
        showMessage('삭제에 실패했습니다.', true);
      }
      return;
    }
    await loadPasskeys();
  }

  // ---------- Session check on load ----------

  async function checkSession() {
    const { ok, body } = await api('/api/session');
    if (ok) {
      await renderUnlocked(body.username);
    } else {
      renderLocked();
      startConditionalLogin();
    }
  }

  // ---------- Login ----------

  async function finishLogin(assertionResponse) {
    const { ok, body } = await api('/api/login-verify', {
      method: 'POST',
      body: JSON.stringify({ response: assertionResponse }),
    });
    if (!ok) {
      showMessage('로그인에 실패했습니다: ' + (body?.error || '알 수 없는 오류'), true);
      return;
    }
    showMessage('');
    const session = await api('/api/session');
    if (session.ok) await renderUnlocked(session.body.username);
  }

  async function startConditionalLogin() {
    if (!window.SimpleWebAuthnBrowser) return;
    const supported = await window.SimpleWebAuthnBrowser.browserSupportsWebAuthnAutofill();
    if (!supported) return;

    try {
      const { ok, body } = await api('/api/login-options', { method: 'POST' });
      if (!ok) return;

      // Resolves only when the user picks a passkey from the browser's native
      // autofill dropdown -- this call just waits quietly in the background.
      const assertion = await window.SimpleWebAuthnBrowser.startAuthentication({
        optionsJSON: body.options,
        useBrowserAutofill: true,
      });
      await finishLogin(assertion);
    } catch (err) {
      // AbortError fires when the explicit login button below cancels this
      // background attempt -- that's expected, not a real failure.
      if (err.name !== 'AbortError') {
        showMessage('자동완성 로그인을 사용할 수 없습니다. 아래 버튼을 이용하세요.', false);
      }
    }
  }

  async function loginWithButton() {
    showMessage('패스키 확인 중...');
    try {
      const { ok, body } = await api('/api/login-options', { method: 'POST' });
      if (!ok) {
        showMessage('로그인을 시작할 수 없습니다.', true);
        return;
      }
      const assertion = await window.SimpleWebAuthnBrowser.startAuthentication({
        optionsJSON: body.options,
      });
      await finishLogin(assertion);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showMessage('로그인이 취소되었습니다.', false);
      } else {
        showMessage('로그인 중 오류가 발생했습니다: ' + err.message, true);
      }
    }
  }

  // ---------- Registration ----------

  async function register(username, nickname, { loggedIn }) {
    const { ok: optOk, body: optBody, status } = await api('/api/register-options', {
      method: 'POST',
      body: JSON.stringify(loggedIn ? {} : { username }),
    });
    if (!optOk) {
      if (status === 409) showMessage('이미 사용 중인 계정 이름입니다.', true);
      else showMessage('등록을 시작할 수 없습니다.', true);
      return;
    }

    let attestation;
    try {
      attestation = await window.SimpleWebAuthnBrowser.startRegistration({ optionsJSON: optBody.options });
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showMessage('등록이 취소되었습니다. 서버에는 아무것도 저장되지 않았습니다.', false);
      } else {
        showMessage('등록 중 오류가 발생했습니다: ' + err.message, true);
      }
      return;
    }

    const { ok, body } = await api('/api/register-verify', {
      method: 'POST',
      body: JSON.stringify({ nickname, response: attestation }),
    });
    if (!ok) {
      showMessage('등록을 완료하지 못했습니다: ' + (body?.error || '알 수 없는 오류'), true);
      return;
    }

    showMessage('');
    const session = await api('/api/session');
    if (session.ok) await renderUnlocked(session.body.username);
  }

  // ---------- Wiring ----------

  function wireLockedForm() {
    $('login-button').addEventListener('click', loginWithButton);

    const registerForm = $('register-form');
    $('show-register-button').addEventListener('click', () => {
      registerForm.hidden = false;
      $('show-register-button').hidden = true;
    });
    $('cancel-register-button').addEventListener('click', () => {
      registerForm.hidden = true;
      $('show-register-button').hidden = false;
      showMessage('');
    });
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = $('register-username').value.trim();
      const nickname = $('register-nickname').value.trim();
      if (!username || !nickname) return;
      register(username, nickname, { loggedIn: false });
    });
  }

  function wireUnlockedPanel() {
    $('logout-button').addEventListener('click', async () => {
      await api('/api/logout', { method: 'POST' });
      renderLocked();
      startConditionalLogin();
    });

    $('add-passkey-button').addEventListener('click', () => {
      const nickname = window.prompt('이 패스키의 이름을 입력하세요 (예: iPhone Face ID)');
      if (!nickname || !nickname.trim()) return;
      register(null, nickname.trim(), { loggedIn: true });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireLockedForm();
    wireUnlockedPanel();
    checkSession();
  });
})();
