/* script.js — AfriMarket Premium
   Clean version: only active code for the current site. */

/* ================================================================
   HERO CAROUSEL — Seamless Infinite Loop
   ================================================================ */
(function initCarousel() {
  const slidesEl = document.getElementById('heroSlides');
  const dotsEl = document.getElementById('heroDots');
  if (!slidesEl || !dotsEl) return;

  // Store original slides
  const originals = [...slidesEl.children];
  const realCount = originals.length;
  if (realCount < 2) return;

  // Clone: first slide → end, last slide → beginning
  const firstClone = originals[0].cloneNode(true);
  const lastClone = originals[realCount - 1].cloneNode(true);
  firstClone.classList.add('clone');
  lastClone.classList.add('clone');

  slidesEl.appendChild(firstClone);
  slidesEl.insertBefore(lastClone, originals[0]);

  // Total slides including clones
  const totalSlides = realCount + 2;

  // Start at the first real slide (index 1, because index 0 is the last-clone)
  let currentIndex = 1;
  let autoTimer;
  let isAnimating = false;

  // Position immediately (no transition)
  slidesEl.classList.add('no-transition');
  slidesEl.style.transform = `translateX(-${currentIndex * 100}%)`;
  // Force reflow then remove no-transition
  slidesEl.offsetHeight;
  slidesEl.classList.remove('no-transition');

  // Create dots (only for real slides)
  for (let i = 0; i < realCount; i++) {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToRealSlide(i));
    dotsEl.appendChild(dot);
  }

  function updateDots() {
    const realIndex = ((currentIndex - 1) + realCount) % realCount;
    [...dotsEl.children].forEach((d, i) => d.classList.toggle('active', i === realIndex));
  }

  function slideTo(index) {
    if (isAnimating) return;
    isAnimating = true;
    currentIndex = index;
    slidesEl.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateDots();

    // After transition, check if we're on a clone and jump silently
    const onTransitionEnd = () => {
      slidesEl.removeEventListener('transitionend', onTransitionEnd);
      isAnimating = false;

      // If landed on first-clone (last real), jump to real first
      if (currentIndex === totalSlides - 1) {
        slidesEl.classList.add('no-transition');
        currentIndex = 1;
        slidesEl.style.transform = `translateX(-${currentIndex * 100}%)`;
        slidesEl.offsetHeight; // force reflow
        slidesEl.classList.remove('no-transition');
        updateDots();
      }
      // If landed on last-clone (first real from prev), jump to real last
      else if (currentIndex === 0) {
        slidesEl.classList.add('no-transition');
        currentIndex = realCount;
        slidesEl.style.transform = `translateX(-${currentIndex * 100}%)`;
        slidesEl.offsetHeight;
        slidesEl.classList.remove('no-transition');
        updateDots();
      }
    };

    slidesEl.addEventListener('transitionend', onTransitionEnd, { once: true });
  }

  function moveSlide(dir) {
    slideTo(currentIndex + dir);
    resetAuto();
  }

  function goToRealSlide(realIndex) {
    // Map real index to position in the cloned track
    slideTo(realIndex + 1);
    resetAuto();
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => moveSlide(1), 6000);
  }

  resetAuto();

  // Expose globally for onclick handlers
  window.moveSlide = moveSlide;
})();

/* ================================================================
   SCROLL REVEAL ANIMATION
   ================================================================ */
(function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach((el) => observer.observe(el));
})();

/* ================================================================
   CATALOGUE FILTER
   ================================================================ */
function filterCatalogue(cat) {
  const cards = document.querySelectorAll('#catalogueGrid .product-card');
  if (!cards.length) return;

  let visibleCount = 0;
  cards.forEach((card) => {
    const cardCat = card.dataset.category;
    const matches =
      cat === 'Toutes' ||
      cardCat === cat ||
      (cat === 'Mode' && cardCat && cardCat.startsWith('Mode'));
    card.style.display = matches ? '' : 'none';
    if (matches) visibleCount++;
  });

  document.querySelectorAll('.cat-pill').forEach((pill) => {
    const pillCat = pill.dataset.cat;
    const active = cat === 'Toutes' ? pillCat === 'Toutes' : pillCat === cat || (cat === 'Mode' && pillCat && pillCat.startsWith('Mode'));
    pill.classList.toggle('active', active);
    pill.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  const heading = document.querySelector('#catalogue .row-head h2');
  if (heading) heading.textContent = 'Toutes les catégories';
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  document.querySelectorAll('.search input[type="text"]').forEach((inp) => (inp.value = ''));

  const emptyMsg = document.getElementById('catEmpty');
  if (emptyMsg) emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';

  closeCatMenu();

  const target = document.getElementById('catalogue');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ================================================================
   CATEGORY DROPDOWN MENU
   ================================================================ */
function toggleCatMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('catDropdown');
  if (!menu) return;
  if (menu.classList.contains('open')) {
    closeCatMenu();
    return;
  }
  const rect = e.currentTarget.getBoundingClientRect();
  menu.style.top = rect.bottom + 6 + 'px';
  menu.style.left = rect.left + 'px';
  menu.classList.add('open');
  e.currentTarget.setAttribute('aria-expanded', 'true');
}

function closeCatMenu() {
  const menu = document.getElementById('catDropdown');
  if (menu) menu.classList.remove('open');
  const btn = document.querySelector('.all-cat');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', closeCatMenu);
window.addEventListener('scroll', closeCatMenu);
window.addEventListener('resize', closeCatMenu);

/* ================================================================
   MOBILE MENU TOGGLE
   ================================================================ */
(function initMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const subnav = document.querySelector('.subnav');
  if (!toggle || !subnav) return;

  toggle.addEventListener('click', () => {
    const open = subnav.classList.toggle('mobile-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.classList.toggle('active', open);
  });

  // Close on link click
  subnav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      subnav.classList.remove('mobile-open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* ================================================================
   FLOATING BACK TO TOP
   ================================================================ */
(function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ================================================================
   CONTACT FORM (if present)
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fullName = form.querySelector('[name="nom"]') || form.querySelector('#fullName');
    const email = form.querySelector('[name="email"]') || form.querySelector('#email');
    const message = form.querySelector('[name="message"]') || form.querySelector('#message');

    if (fullName && !fullName.value.trim()) { alert('Veuillez entrer votre nom.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { alert('Adresse e-mail invalide.'); return; }
    if (message && !message.value.trim()) { alert('Veuillez entrer votre message.'); return; }

    alert('Votre message a été envoyé avec succès !');
    form.reset();
  });
});

/* ================================================================
   SMOOTH IMAGE ERROR HANDLING
   ================================================================ */
document.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG' && !e.target.dataset.retried) {
    e.target.dataset.retried = '1';
    e.target.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
      '<rect fill="#EDEDF3" width="400" height="400"/>' +
      '<text fill="#8E8C9E" font-family="sans-serif" font-size="14" text-anchor="middle" x="200" y="195">Image non disponible</text>' +
      '<text fill="#8E8C9E" font-family="sans-serif" font-size="12" text-anchor="middle" x="200" y="215">AfriMarket</text>' +
      '</svg>'
    );
  }
}, true);
