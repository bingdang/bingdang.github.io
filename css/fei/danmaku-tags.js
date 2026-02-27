/* 侧边栏标签弹幕效果 - B站风格 */
(function () {
  // 全局缓存标签数据，防止 pjax 后丢失
  var savedTagData = null;
  var activeInterval = null;
  var activeCanvas = null;

  function initDanmakuTags() {
    var container = document.querySelector('#aside-content .card-tags .card-tag-cloud');
    if (!container) return;

    // 如果已有正在运行的弹幕画布且还在 DOM 中，跳过
    if (activeCanvas && document.contains(activeCanvas) && activeInterval) return;

    // 清理旧定时器
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
    }

    // 尝试从当前 DOM 读取原始标签（仅在有原始 <a> 时）
    var originalTags = Array.from(container.querySelectorAll('a:not(.danmaku-bullet)'));
    if (originalTags.length > 0 && !container.querySelector('.danmaku-canvas')) {
      savedTagData = originalTags.map(function (a) {
        var sup = a.querySelector('sup');
        return {
          href: a.getAttribute('href'),
          text: a.childNodes[0] ? a.childNodes[0].textContent : a.textContent,
          color: a.style.color || '',
          count: sup ? sup.textContent : ''
        };
      });
    }

    if (!savedTagData || savedTagData.length === 0) return;

    // 创建弹幕画布
    container.innerHTML = '';
    container.classList.add('danmaku-init');
    var canvas = document.createElement('div');
    canvas.className = 'danmaku-canvas';
    container.appendChild(canvas);
    activeCanvas = canvas;

    var canvasHeight = 220;
    var itemHeight = 26;
    var paused = false;

    // 无限循环标签池
    var pool = [];
    var poolIdx = 0;
    function nextTag() {
      if (poolIdx >= pool.length) {
        pool = savedTagData.slice();
        for (var i = pool.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        }
        poolIdx = 0;
      }
      return pool[poolIdx++];
    }

    // 发射一条弹幕
    function shootOne() {
      // 安全检查：画布是否还在 DOM 中
      if (!document.contains(canvas)) {
        clearInterval(activeInterval);
        activeInterval = null;
        return;
      }
      var data = nextTag();
      var el = document.createElement('a');
      el.className = 'danmaku-bullet';
      el.href = data.href;
      el.textContent = data.text;
      if (data.count) {
        var sup = document.createElement('sup');
        sup.textContent = data.count;
        el.appendChild(sup);
      }
      if (data.color) el.style.color = data.color;

      var maxTop = canvasHeight - itemHeight;
      el.style.top = Math.floor(Math.random() * maxTop) + 'px';

      var duration = 10 + Math.random() * 10;
      el.style.animationDuration = duration.toFixed(1) + 's';

      canvas.appendChild(el);

      el.addEventListener('animationend', function () {
        try { canvas.removeChild(el); } catch (e) {}
      });
    }

    // 每 1100ms 发射一条
    activeInterval = setInterval(function () {
      if (!paused) shootOne();
    }, 1100);

    // 开局先发 4 条
    for (var i = 0; i < 4; i++) {
      (function (d) { setTimeout(function () { if (!paused) shootOne(); }, d); })(i * 500);
    }

    // hover 暂停
    canvas.addEventListener('mouseenter', function () {
      paused = true;
      var bs = canvas.querySelectorAll('.danmaku-bullet');
      for (var k = 0; k < bs.length; k++) bs[k].style.animationPlayState = 'paused';
    });
    canvas.addEventListener('mouseleave', function () {
      paused = false;
      var bs = canvas.querySelectorAll('.danmaku-bullet');
      for (var k = 0; k < bs.length; k++) bs[k].style.animationPlayState = 'running';
    });
  }

  // pjax 兼容：等 DOM 稳定后再初始化
  function onPjaxComplete() {
    // 清理旧的
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
    }
    activeCanvas = null;
    // 等侧边栏 DOM 渲染完成
    setTimeout(initDanmakuTags, 300);
  }

  document.addEventListener('DOMContentLoaded', initDanmakuTags);
  document.addEventListener('pjax:complete', onPjaxComplete);
})();
