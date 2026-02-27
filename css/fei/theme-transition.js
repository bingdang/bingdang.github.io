(function() {
  function createTransitionOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.innerHTML = `
      <div class="theme-transition-sun">
        <div class="sun-rays"></div>
      </div>
      <div class="theme-transition-moon">
        <div class="moon-craters"></div>
      </div>
      <div class="theme-transition-cloud cloud-1"><i class="fas fa-cloud"></i></div>
      <div class="theme-transition-cloud cloud-2"><i class="fas fa-cloud"></i></div>
      <div class="theme-transition-cloud cloud-3"><i class="fas fa-cloud"></i></div>
      <div class="theme-transition-cloud cloud-4"><i class="fas fa-cloud"></i></div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }
  
  function createStars(overlay, count) {
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'theme-transition-star';
      star.innerHTML = '<i class="fas fa-star"></i>';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 0.5 + 's';
      overlay.appendChild(star);
    }
  }
  
  function playTransition(toDark) {
    const overlay = createTransitionOverlay();
    const sun = overlay.querySelector('.theme-transition-sun');
    const moon = overlay.querySelector('.theme-transition-moon');
    const clouds = overlay.querySelectorAll('.theme-transition-cloud');
    
    if (toDark) {
      overlay.classList.add('to-dark');
      createStars(overlay, 20);
      
      sun.innerHTML = '<i class="fas fa-sun"></i><div class="sun-rays"></div>';
      moon.innerHTML = '<i class="fas fa-moon"></i><div class="moon-craters"></div>';
      
      sun.style.top = '30%';
      sun.style.opacity = '1';
      
      setTimeout(() => {
        sun.style.transition = 'all 1s ease-in-out';
        sun.style.top = '110%';
        sun.style.opacity = '0';
      }, 100);
      
      setTimeout(() => {
        moon.style.top = '30%';
        moon.style.opacity = '1';
        moon.style.transition = 'all 1s ease-in-out';
        
        const allStars = overlay.querySelectorAll('.theme-transition-star');
        allStars.forEach((star, index) => {
          star.style.animation = `star-twinkle 0.5s ease-in-out infinite`;
          star.style.animationDelay = (index * 0.05) + 's';
          star.style.opacity = '1';
        });
      }, 800);
      
    } else {
      overlay.classList.add('to-light');
      
      sun.innerHTML = '<i class="fas fa-sun"></i><div class="sun-rays"></div>';
      moon.innerHTML = '<i class="fas fa-moon"></i><div class="moon-craters"></div>';
      
      moon.style.top = '30%';
      moon.style.opacity = '1';
      
      setTimeout(() => {
        moon.style.transition = 'all 1s ease-in-out';
        moon.style.top = '-100px';
        moon.style.opacity = '0';
      }, 100);
      
      setTimeout(() => {
        sun.style.top = '30%';
        sun.style.opacity = '1';
        sun.style.transition = 'all 1s ease-in-out';
        
        clouds.forEach((cloud, index) => {
          cloud.style.top = (20 + index * 15) + '%';
          cloud.style.opacity = '0.9';
          cloud.style.transition = 'all 1.5s ease-in-out';
          cloud.style.transitionDelay = (index * 0.1) + 's';
        });
      }, 800);
    }
    
    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        overlay.remove();
      }, 500);
    }, 2500);
  }
  
  let isTransitioning = false;
  
  function handleDarkModeClick(e) {
    if (isTransitioning) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    const nowMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const toDark = nowMode === 'light';
    
    isTransitioning = true;
    e.preventDefault();
    e.stopPropagation();
    
    playTransition(toDark);
    
    setTimeout(() => {
      if (toDark) {
        window.activateDarkMode();
        window.saveToLocal.set('theme', 'dark', 2);
      } else {
        window.activateLightMode();
        window.saveToLocal.set('theme', 'light', 2);
      }
      
      if (window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.Snackbar) {
        window.btf.snackbarShow(toDark ? window.GLOBAL_CONFIG.Snackbar.day_to_night : window.GLOBAL_CONFIG.Snackbar.night_to_day);
      }
      
      isTransitioning = false;
    }, 1200);
  }
  
  function init() {
    const darkmodeBtn = document.getElementById('darkmode');
    if (darkmodeBtn) {
      darkmodeBtn.addEventListener('click', handleDarkModeClick, true);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  document.addEventListener('pjax:complete', init);
  
  function createFooterMeteor() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (!isDark) return;
    
    const meteor = document.createElement('div');
    meteor.className = 'footer-meteor';
    
    const startX = Math.random() * footer.offsetWidth;
    const startY = Math.random() * (footer.offsetHeight * 0.5);
    
    meteor.style.left = startX + 'px';
    meteor.style.top = startY + 'px';
    
    const duration = 0.8 + Math.random() * 0.4;
    meteor.style.animation = `meteor-fall ${duration}s linear forwards`;
    
    footer.appendChild(meteor);
    
    setTimeout(() => {
      meteor.remove();
    }, duration * 1000);
  }
  
  function startFooterMeteors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (!isDark) return;
    
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      setTimeout(createFooterMeteor, i * 200 + Math.random() * 300);
    }
  }
  
  setInterval(startFooterMeteors, 3000);
  
  function createCardInfoStar() {
    const cardInfo = document.querySelector('.card-widget.card-info');
    if (!cardInfo) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (!isDark) return;
    
    const star = document.createElement('div');
    star.className = 'card-info-star';
    
    const rect = cardInfo.getBoundingClientRect();
    const padding = 20;
    const x = padding + Math.random() * (rect.width - padding * 2);
    const y = padding + Math.random() * (rect.height - padding * 2);
    
    star.style.left = x + 'px';
    star.style.top = y + 'px';
    
    const duration = 1 + Math.random() * 1;
    star.style.animation = `star-sparkle ${duration}s ease-in-out forwards`;
    
    cardInfo.appendChild(star);
    
    setTimeout(() => {
      star.remove();
    }, duration * 1000);
  }
  
  function startCardInfoStars() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (!isDark) return;
    
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      setTimeout(createCardInfoStar, i * 300 + Math.random() * 200);
    }
  }
  
  setInterval(startCardInfoStars, 4000);
  
  const originalActivateDarkMode = window.activateDarkMode;
  const originalActivateLightMode = window.activateLightMode;
  
  window.activateDarkMode = function() {
    if (originalActivateDarkMode) originalActivateDarkMode();
    setTimeout(startFooterMeteors, 500);
    setTimeout(startCardInfoStars, 1000);
  };
})();
