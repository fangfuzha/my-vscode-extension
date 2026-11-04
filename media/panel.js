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
  });

  window.addEventListener('message', function (event) {
    const message = event.data;

    if (message.type === 'init') {
      strings = message.strings || {};
      applyValues(message.values || {});
      if (message.authText) {
        setStatus('auth', message.authText);
      }
    } else if (message.type === 'licenses') {
      fillLicenses(message.items || []);
    } else if (message.type === 'saved') {
      applyValues(message.values || {});
      document.getElementById('message').textContent = message.reset ? strings.resetDone : strings.saved;
    } else if (message.type === 'auth') {
      setStatus('auth', message.text || strings.signedOut || '');
    } else if (message.type === 'error') {
      document.getElementById('message').textContent = message.message;
    }
  });

  post('ready');
})();
