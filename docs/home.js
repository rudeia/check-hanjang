'use strict';
(() => {
  function route() {
    const activity = location.hash && location.hash !== '#home';
    document.body.classList.toggle('at-home', !activity);
    document.querySelector('#home').hidden = !!activity;
    document.querySelector('#activity-root').hidden = !activity;
  }
  window.addEventListener('hashchange', route);
  route();
})();
