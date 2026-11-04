(function () {
  const vscode = acquireVsCodeApi();

  let strings = {};

  function post(type, payload) {
    vscode.postMessage(Object.assign({ type: type }, payload || {}));
  }

  function fields() {
    return document.querySelectorAll('[data-key]');
  }

  // 把设置值填进 HTML 里已经写好的表单控件
  function applyValues(values) {
    fields().forEach(function (element) {
      const value = values[element.dataset.key];
      if (value === undefined) {
        return;
      }
      if (element.type === 'checkbox') {
        element.checked = !!value;
      } else {
        element.value = value;
      }
    });
  }

  // 从 HTML 里已经写好的表单控件收集设置值
  function collect() {
    const result = {};
    fields().forEach(function (element) {
      result[element.dataset.key] =
        element.type === 'checkbox' ? element.checked : element.value;
    });
    return result;
  }

  function setStatus(name, text) {
    const target = document.querySelector('[data-status="' + name + '"]');
    if (target) {
      target.textContent = text;
    }
  }

  // 登录与登出互斥：按登录态只显示其中一个按钮
  function applyAuthState(signedIn) {
    document.querySelectorAll('[data-auth-show]').forEach(function (element) {
      const wanted = element.dataset.authShow === 'signedIn';
      element.hidden = wanted !== signedIn;
    });
  }

  function setContext7Status(configured) {
    setStatus('context7', configured ? strings.context7Configured : strings.context7NotConfigured);
  }

  function showSection(name) {
    document.querySelectorAll('[data-section]').forEach(function (section) {
      section.classList.toggle('active', section.dataset.section === name);
    });
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      link.classList.toggle('active', link.dataset.nav === name);
    });
  }

  // 许可证列表来自 API，属于数据填充，不改变页面结构
  function fillLicenses(items) {
    const select = document.querySelector('select[data-dynamic="licenses"]');
    if (!select) {
      return;
    }
    const current = select.value;
    select.innerHTML = '';
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = strings.noLicense || '';
    select.appendChild(empty);
    items.forEach(function (item) {
      const option = document.createElement('option');
      option.value = item.key;
      option.textContent = item.spdxId + ' - ' + item.name;
      select.appendChild(option);
    });
    select.value = current;
  }

  document.getElementById('save').addEventListener('click', function () {
    post('save', { values: collect() });
  });

  document.getElementById('reset').addEventListener('click', function () {
    post('reset');
  });

  document.querySelectorAll('button[data-action]').forEach(function (button) {
    button.addEventListener('click', function () {
      post('action', { action: button.dataset.action });
    });

    document.querySelectorAll('[data-nav]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        showSection(link.dataset.nav);
        window.history.replaceState(null, '', '#' + link.dataset.nav);
      });
    });

    if (window.location.hash) {
      showSection(window.location.hash.slice(1));
    }
  });

  window.addEventListener('message', function (event) {
    const message = event.data;

    if (message.type === 'init') {
      strings = message.strings || {};
      applyValues(message.values || {});
      setContext7Status(!!message.context7Configured);
      applyAuthState(!!message.signedIn);
      if (message.authText) {
        setStatus('auth', message.authText);
      }
    } else if (message.type === 'licenses') {
      fillLicenses(message.items || []);
    } else if (message.type === 'saved') {
      applyValues(message.values || {});
      if (message.context7Configured !== undefined) {
        setContext7Status(!!message.context7Configured);
      }
      document.getElementById('message').textContent = message.reset ? strings.resetDone : strings.saved;
    } else if (message.type === 'auth') {
      applyAuthState(!!message.signedIn);
      setStatus('auth', message.text || strings.signedOut || '');
    } else if (message.type === 'error') {
      document.getElementById('message').textContent = message.message;
    }
  });

  post('ready');
})();
