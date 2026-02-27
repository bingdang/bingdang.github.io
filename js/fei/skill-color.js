/**
 * 技能图标背景色自动提取与互补色生成
 * 自动从图标图片提取主色调，并生成不重复的互补色作为背景
 */
(function() {
  'use strict';

  // RGB 转 HSL
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  // HSL 转 RGB
  function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // 提取图片主色调
  function extractDominantColor(imgElement, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 50;
    canvas.height = 50;
    
    try {
      ctx.drawImage(imgElement, 0, 0, 50, 50);
      const imageData = ctx.getImageData(0, 0, 50, 50).data;
      
      let r = 0, g = 0, b = 0, count = 0;
      let hasColor = false;
      
      // 采样计算平均颜色
      for (let i = 0; i < imageData.length; i += 16) {
        const alpha = imageData[i + 3];
        if (alpha > 128) { // 只统计不透明的像素
          const pr = imageData[i];
          const pg = imageData[i + 1];
          const pb = imageData[i + 2];
          
          // 检测是否有彩色（非纯黑白）
          if (Math.abs(pr - pg) > 10 || Math.abs(pg - pb) > 10 || Math.abs(pr - pb) > 10) {
            hasColor = true;
          }
          
          r += pr;
          g += pg;
          b += pb;
          count++;
        }
      }
      
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        
        // 如果图片太暗或太亮，调整为中间色调
        const brightness = (r + g + b) / 3;
        if (brightness < 30) {
          // 纯黑色图标，使用默认蓝色
          r = 66; g = 133; b = 244;
        } else if (brightness > 240 && !hasColor) {
          // 纯白色图标，使用默认灰色
          r = 120; g = 120; b = 120;
        }
      } else {
        // 完全透明，使用默认颜色
        r = 100; g = 100; b = 100;
      }
      
      callback({ r, g, b });
    } catch (e) {
      // 跨域或其他错误，返回默认值
      callback({ r: 128, g: 128, b: 128 });
    }
  }

  // 检测是否为暗黑模式
  function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // 生成协调的背景色
  function generateComplementaryColor(rgb) {
    const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const darkMode = isDarkMode();
    
    // 使用类似色而非互补色，更协调（色相偏移30-60度）
    let newH = (h + 40 + Math.random() * 20) % 360;
    
    if (darkMode) {
      // 暗黑模式：深色背景，低饱和度
      let newS = Math.max(8, Math.min(20, s * 0.3)); // 极低饱和度
      let newL = Math.max(12, Math.min(22, l * 0.25)); // 深色背景
      const [r, g, b] = hslToRgb(newH, newS, newL);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // 浅色模式：柔和的浅色背景
      let newS = Math.max(12, Math.min(35, s * 0.4)); // 低饱和度
      let newL = Math.max(88, Math.min(96, 100 - l * 0.15)); // 很浅的背景
      const [r, g, b] = hslToRgb(newH, newS, newL);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  // 生成阴影颜色
  function generateShadowColor(rgb) {
    const darkMode = isDarkMode();
    if (darkMode) {
      // 暗黑模式：更深、更透明的阴影
      return `rgba(0, 0, 0, 0.4)`;
    } else {
      // 浅色模式：柔和的阴影
      const r = Math.max(0, rgb.r - 60);
      const g = Math.max(0, rgb.g - 60);
      const b = Math.max(0, rgb.b - 60);
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    }
  }

  // 处理单个图标
  function processSkillIcon(iconElement) {
    const img = iconElement.querySelector('img');
    if (!img) return;
    
    const processImage = () => {
      extractDominantColor(img, (dominantColor) => {
        const bgColor = generateComplementaryColor(dominantColor);
        const shadowColor = generateShadowColor(dominantColor);
        
        iconElement.style.background = bgColor;
        iconElement.style.boxShadow = `0 8px 12px -3px ${shadowColor}`;
        iconElement.setAttribute('data-processed', 'true');
        
        // 着色完成后显示
        setTimeout(() => {
          iconElement.setAttribute('data-color-ready', 'true');
        }, 50);
      });
    };
    
    if (img.complete && img.naturalWidth > 0) {
      processImage();
    } else {
      img.addEventListener('load', processImage);
      img.addEventListener('error', () => {
        // 加载失败，使用默认颜色并显示
        iconElement.style.background = 'var(--card-bg)';
        iconElement.setAttribute('data-color-ready', 'true');
      });
    }
  }

  // 初始化所有技能图标
  function initSkillColors() {
    const skillIcons = document.querySelectorAll('.skill-icon:not([data-processed])');
    
    skillIcons.forEach((icon, index) => {
      // 延迟处理，避免同时加载太多图片
      setTimeout(() => {
        processSkillIcon(icon);
      }, index * 50);
    });
  }

  // 重新处理所有图标（主题切换时）
  function reprocessAllIcons() {
    const skillIcons = document.querySelectorAll('.skill-icon[data-processed]');
    skillIcons.forEach((icon, index) => {
      // 先隐藏
      icon.removeAttribute('data-color-ready');
      
      setTimeout(() => {
        icon.removeAttribute('data-processed');
        processSkillIcon(icon);
      }, 100 + index * 20); // 错开处理，波浪效果
    });
  }

  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkillColors);
  } else {
    initSkillColors();
  }

  // 支持 PJAX
  if (typeof window.pjax !== 'undefined') {
    document.addEventListener('pjax:complete', initSkillColors);
  }

  // 监听主题切换
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        setTimeout(reprocessAllIcons, 100);
      }
    });
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }
})();
