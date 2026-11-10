/* DLAB Detailing Studio — interactions (vanilla JS, no dependencies) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const desktop = window.matchMedia('(min-width: 1024px)');

  /* ---------- Header: solid on scroll ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.hidden = !open;
    header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
  });
  desktop.addEventListener('change', () => setMenu(false));

  /* ---------- Scroll reveal (one time) ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Active nav link ---------- */
  const navLinks = $$('.nav__link');
  const sections = navLinks.map((a) => $(a.getAttribute('href')));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  [$('#top'), ...sections].forEach((s) => s && spy.observe(s));

  /* ---------- Services accordion + media swap ---------- */
  const items = $$('.svc');
  const media = $$('.services__media img');
  const showMedia = (key) => media.forEach((img) => img.classList.toggle('is-active', img.dataset.media === key));

  const toggle = (item, force) => {
    const btn = $('.svc__head', item);
    const panel = $('.svc__panel', item);
    const open = force ?? btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (open) {
      showMedia(item.dataset.svc);
      // one panel open at a time keeps the list calm
      items.forEach((other) => { if (other !== item) toggle(other, false); });
    }
  };

  items.forEach((item) => {
    $('.svc__head', item).addEventListener('click', () => toggle(item));
    item.addEventListener('mouseenter', () => { if (desktop.matches) showMedia(item.dataset.svc); });
  });
  $('.services__list')?.addEventListener('mouseleave', () => {
    const open = items.find((i) => $('.svc__head', i).getAttribute('aria-expanded') === 'true');
    showMedia(open ? open.dataset.svc : 'wash');
  });

  // Hero index links open the matching service
  $$('.hero__index a').forEach((a) => {
    a.addEventListener('click', () => {
      const item = $(a.getAttribute('href'));
      if (item) toggle(item, true);
    });
  });

  /* ---------- Before / After ---------- */
  const ba = $('[data-ba]');
  if (ba) {
    const range = $('.ba__range', ba);
    const set = (v) => ba.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
    set(range.value);
  }

  /* ---------- Booking: chosen service ---------- */
  const form = $('[data-form]');
  const chosen = $('[data-chosen]');
  const chosenName = $('[data-chosen-name]');
  const serviceInput = $('[data-service]');
  const setService = (name) => {
    serviceInput.value = name || '';
    chosenName.textContent = name || '';
    chosen.hidden = !name;
  };
  $$('[data-book]').forEach((a) => a.addEventListener('click', () => setService(a.dataset.book)));
  $('[data-chosen-clear]').addEventListener('click', () => setService(''));

  /* ---------- Booking: phone mask (+370 6XX XXXXX) ---------- */
  const phone = $('#f-phone');
  phone.addEventListener('input', () => {
    let d = phone.value.replace(/\D/g, '');
    if (d.startsWith('370')) d = d.slice(3);
    if (d.startsWith('8')) d = d.slice(1); // local "8 6xx" format
    d = d.slice(0, 8);
    phone.value = d.length > 3 ? d.slice(0, 3) + ' ' + d.slice(3) : d;
  });

  /* ---------- Booking: validation + submit ---------- */
  const name = $('#f-name');
  const rules = [
    [name, () => name.value.trim().length >= 2, 'Укажите имя'],
    [phone, () => phone.value.replace(/\D/g, '').length === 8, 'Введите номер: 8 цифр после +370'],
  ];
  const check = ([input, ok, msg]) => {
    const field = input.closest('.field');
    const valid = ok();
    field.classList.toggle('is-invalid', !valid);
    input.setAttribute('aria-invalid', String(!valid));
    $('.field__error', field).textContent = valid ? '' : msg;
    return valid;
  };
  rules.forEach((r) => r[0].addEventListener('blur', () => { if (r[0].value) check(r); }));
  rules.forEach((r) => r[0].addEventListener('input', () => {
    if (r[0].closest('.field').classList.contains('is-invalid')) check(r);
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const results = rules.map(check);
    if (results.includes(false)) { rules[results.indexOf(false)][0].focus(); return; }

    const btn = $('[data-submit]');
    btn.setAttribute('data-loading', '');
    btn.textContent = 'Отправляем…';

    const payload = {
      name: name.value.trim(),
      phone: '+370 ' + phone.value,
      service: serviceInput.value,
    };

    try {
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Request failed');
      } else {
        // PLACEHOLDER: no form handler yet. Simulates a successful send for the prototype.
        console.info('[DLAB] form endpoint is not configured, payload:', payload);
        await new Promise((r) => setTimeout(r, 600));
      }
      form.hidden = true;
      const ok = $('[data-success]');
      ok.hidden = false;
      ok.focus();
    } catch {
      btn.removeAttribute('data-loading');
      btn.textContent = 'Записаться';
      const field = phone.closest('.field');
      $('.field__error', field).textContent = 'Не удалось отправить. Попробуйте ещё раз или позвоните нам.';
    }
  });

  /* ---------- Mobile sticky CTA ---------- */
  const sticky = $('[data-sticky]');
  const stickyLink = $('a', sticky);
  const hero = $('.hero');
  const booking = $('#booking');
  let heroOut = false;
  let bookingIn = false;
  const updateSticky = () => {
    const show = heroOut && !bookingIn && menu.hidden;
    sticky.classList.toggle('is-visible', show);
    sticky.setAttribute('aria-hidden', String(!show));
    stickyLink.tabIndex = show ? 0 : -1;
  };
  new IntersectionObserver(([en]) => { heroOut = !en.isIntersecting; updateSticky(); }).observe(hero);
  new IntersectionObserver(([en]) => { bookingIn = en.isIntersecting; updateSticky(); }, { rootMargin: '0px 0px -20% 0px' }).observe(booking);

  /* ---------- Footer year ---------- */
  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
