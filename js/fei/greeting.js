(function() {
  const STORAGE_KEY = 'greeting_last_shown';
  const COOLDOWN_MS = 30 * 60 * 1000;

  function getLastShown() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function setLastShown() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }

  function shouldShowGreeting() {
    const lastShown = getLastShown();
    if (!lastShown) return true;
    return Date.now() - parseInt(lastShown) > COOLDOWN_MS;
  }

  function getGreeting() {
    const hour = new Date().getHours();
    let icon, title, message;

    if (hour >= 6 && hour < 11) {
      icon = '☀️';
      title = '早安';
      message = '新的一天，元气满满～记得吃早餐哦！';
    } else if (hour >= 11 && hour < 14) {
      icon = '🍱';
      title = '中午好';
      message = '忙碌了一上午，记得吃饭休息哦！';
    } else if (hour >= 14 && hour < 18) {
      icon = '☕';
      title = '下午好';
      message = '来杯咖啡提提神，继续加油！';
    } else if (hour >= 18 && hour < 22) {
      icon = '🌙';
      title = '晚上好';
      message = '放松一下吧，享受美好的夜晚时光～';
    } else {
      icon = '💤';
      title = '夜深了';
      message = '这么晚还在浏览，早点休息哦！';
    }

    return { icon, title, message };
  }

  function createToast() {
    const { icon, title, message } = getGreeting();

    const toast = document.createElement('div');
    toast.className = 'greeting-toast';
    toast.innerHTML = `
      <span class="greeting-toast-icon">${icon}</span>
      <div class="greeting-toast-content">
        <div class="greeting-toast-title">${title}</div>
        <div class="greeting-toast-message">${message}</div>
      </div>
      <span class="greeting-toast-close">✕</span>
    `;

    document.body.appendChild(toast);

    const closeBtn = toast.querySelector('.greeting-toast-close');
    closeBtn.addEventListener('click', () => hideToast(toast));

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      hideToast(toast);
    }, 5000);

    setLastShown();
  }

  function hideToast(toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  }

  function init() {
    if (!shouldShowGreeting()) return;

    if (document.readyState === 'complete') {
      setTimeout(createToast, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(createToast, 1000);
      });
    }
  }

  init();
})();
