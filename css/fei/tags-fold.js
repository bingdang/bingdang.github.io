/* 文章标签超过3个时折叠，hover展开 */
(function () {
  var MAX_VISIBLE = 3;
  var popup = null;

  function createPopup() {
    if (popup) return popup;
    popup = document.createElement('div');
    popup.className = 'tags-more-popup';
    document.body.appendChild(popup);
    return popup;
  }

  function showPopup(btn, tags) {
    var p = createPopup();
    p.innerHTML = '';
    tags.forEach(function (t) {
      var a = document.createElement('a');
      a.href = t.href;
      a.textContent = t.text;
      p.appendChild(a);
    });

    // 获取按钮位置
    var rect = btn.getBoundingClientRect();
    
    // 先显示获取实际宽度
    p.style.visibility = 'hidden';
    p.style.opacity = '0';
    p.style.left = '0';
    p.style.top = '0';
    p.classList.add('show');
    
    requestAnimationFrame(function () {
      var pw = p.offsetWidth;
      // 浮层右边缘对齐按钮右边缘，不超出卡片
      var right = rect.right;
      var left = right - pw;
      // 确保不超出左边界
      if (left < 10) left = 10;
      // 确保不超出右边界
      if (left + pw > window.innerWidth - 10) {
        left = window.innerWidth - pw - 10;
      }
      
      p.style.left = left + 'px';
      p.style.top = (rect.top - p.offsetHeight - 2) + 'px';
      p.style.visibility = 'visible';
      p.style.opacity = '1';
    });
  }

  function hidePopup() {
    if (popup) {
      popup.classList.remove('show');
      popup.style.opacity = '0';
    }
  }

  function foldTags() {
    var containers = document.querySelectorAll('#recent-posts .article-meta.tags');
    containers.forEach(function (container) {
      if (container.querySelector('.tags-more-btn')) return;

      var allTags = Array.from(container.querySelectorAll('a.article-meta__tags'));
      if (allTags.length <= MAX_VISIBLE) return;

      var hiddenTags = allTags.slice(MAX_VISIBLE);
      var hiddenData = hiddenTags.map(function (a) {
        return { href: a.href, text: a.textContent };
      });

      // 隐藏多余标签和分隔符
      hiddenTags.forEach(function (tag) {
        tag.style.display = 'none';
        var prev = tag.previousElementSibling;
        if (prev && prev.classList.contains('article-meta-link')) {
          prev.style.display = 'none';
        }
      });

      // 创建按钮 - 用 a 标签并添加原标签的 class，继承完全一样的样式
      var btn = document.createElement('a');
      btn.className = 'article-meta__tags tags-more-btn';
      btn.href = 'javascript:void(0)';
      btn.textContent = '+' + hiddenTags.length;
      btn._hiddenTags = hiddenData;

      btn.addEventListener('mouseenter', function () {
        showPopup(btn, btn._hiddenTags);
      });
      btn.addEventListener('mouseleave', function () {
        setTimeout(function () {
          if (popup && !popup.matches(':hover')) hidePopup();
        }, 100);
      });
      // 手机端点击支持
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (popup && popup.classList.contains('show')) {
          hidePopup();
        } else {
          showPopup(btn, btn._hiddenTags);
        }
      });

      container.appendChild(btn);
    });
  }

  // popup 离开时隐藏
  document.addEventListener('mouseout', function (e) {
    if (popup && popup.classList.contains('show')) {
      var related = e.relatedTarget;
      if (!related || (!related.closest('.tags-more-popup') && !related.closest('.tags-more-btn'))) {
        hidePopup();
      }
    }
  });

  // 滚动时隐藏
  window.addEventListener('scroll', hidePopup, { passive: true });

  // 点击其他地方隐藏
  document.addEventListener('click', function (e) {
    if (popup && popup.classList.contains('show')) {
      if (!e.target.closest('.tags-more-popup') && !e.target.closest('.tags-more-btn')) {
        hidePopup();
      }
    }
  });

  document.addEventListener('DOMContentLoaded', foldTags);
  document.addEventListener('pjax:complete', function () {
    setTimeout(foldTags, 100);
  });
})();
