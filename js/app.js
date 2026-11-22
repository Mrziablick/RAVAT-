/* Чайхана RAVAT — логика сайта: меню, предзаказ, бронирование */

(function () {
  'use strict';

  const VENUE_PHONE = '77066565500';
  const VENUE_NAME = 'RAVAT';
  const CART_KEY = 'ravat.cart.v1';
  const BOOKING_KEY = 'ravat.bookings.v1';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------- utils ---------------- */
  const money = (n) => n.toLocaleString('ru-RU').replace(/\u00A0/g, ' ') + ' ₸';

  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-on'), 2200);
  }

  /* ---------------- cart state ---------------- */
  let cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    if (saved && typeof saved === 'object') cart = saved;
  } catch (e) { cart = {}; }

  const findItem = (id) => RAVAT_MENU.find((i) => i.id === id);
  const saveCart = () => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ }
  };
  const cartLines = () =>
    Object.keys(cart)
      .filter((id) => cart[id] > 0 && findItem(id))
      .map((id) => ({ item: findItem(id), qty: cart[id] }));
  const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);
  const cartTotal = () => cartLines().reduce((s, l) => s + l.qty * l.item.price, 0);

  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    syncCartUI();
    const it = findItem(id);
    toast(it ? it.name + ' — в предзаказе' : 'Добавлено в предзаказ');
  }
  function changeQty(id, delta) {
    const next = (cart[id] || 0) + delta;
    if (next <= 0) delete cart[id]; else cart[id] = next;
    saveCart();
    syncCartUI();
  }

  function syncCartUI() {
    const count = cartCount();
    const total = cartTotal();

    const badge = $('#cartBadge');
    badge.textContent = count;
    badge.hidden = count === 0;

    $('#cartCountLabel').textContent = count + ' ' + plural(count, 'позиция', 'позиции', 'позиций');
    $('#cartTotal').textContent = money(total);

    const pre = $('#preorderList');
    const preTotal = $('#preorderTotal');
    if (count === 0) {
      pre.innerHTML = '<p class="preorder__empty">Пока пусто. Предзаказ необязателен — можно дополнить меню на месте.</p>';
      preTotal.hidden = true;
    } else {
      pre.innerHTML = cartLines().map((l) =>
        '<div class="preorder__row"><span>' + esc(l.item.name) + ' <em>×' + l.qty + '</em></span><b>' + money(l.qty * l.item.price) + '</b></div>'
      ).join('');
      preTotal.hidden = false;
      $('#preorderSum').textContent = money(total);
    }

    renderCartDrawer();
    renderMenu(currentCat, currentQuery, true);
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderCartDrawer() {
    const box = $('#cartItems');
    const lines = cartLines();
    if (!lines.length) {
      box.innerHTML = '<div class="drawer__empty"><p>В предзаказе пока ничего нет.</p><span>Загляните в меню — горячая самса и плов будут ждать вас к приходу.</span><button type="button" class="btn btn--outline btn--sm" data-goto-tab="all">Открыть меню</button></div>';
      return;
    }
    box.innerHTML = lines.map((l) =>
      '<div class="cart-line">' +
        '<div class="cart-line__info"><h4>' + esc(l.item.name) + '</h4><span>' + l.item.weight + ' · ' + money(l.item.price) + '</span></div>' +
        '<div class="cart-line__right">' +
          '<div class="stepper">' +
            '<button type="button" data-dec="' + l.item.id + '" aria-label="Убрать одну порцию">−</button>' +
            '<span>' + l.qty + '</span>' +
            '<button type="button" data-inc="' + l.item.id + '" aria-label="Добавить порцию">+</button>' +
          '</div>' +
          '<b>' + money(l.qty * l.item.price) + '</b>' +
        '</div>' +
      '</div>'
    ).join('');
  }

  /* ---------------- menu render ---------------- */
  let currentCat = 'all';
  let currentQuery = '';

  const TAG_LABEL = { hit: 'Хит', new: 'Новинка', veg: 'Вег' };

  function tabsBuild() {
    $('#tabs').innerHTML = RAVAT_CATEGORIES.map((c) =>
      '<button type="button" role="tab" class="tab' + (c.id === currentCat ? ' is-active' : '') + '" data-cat="' + c.id + '" aria-selected="' + (c.id === currentCat) + '">' + c.title + '</button>'
    ).join('');
  }

  function dishCard(item) {
    const qty = cart[item.id] || 0;
    const control = qty
      ? '<div class="stepper stepper--sm">' +
          '<button type="button" data-dec="' + item.id + '" aria-label="Убрать">−</button>' +
          '<span>' + qty + '</span>' +
          '<button type="button" data-inc="' + item.id + '" aria-label="Добавить">+</button>' +
        '</div>'
      : '<button type="button" class="dish__add" data-add="' + item.id + '" aria-label="Добавить в предзаказ">+</button>';

    return '<article class="dish" data-id="' + item.id + '">' +
      '<div class="dish__main">' +
        '<div class="dish__title"><h4>' + esc(item.name) + '</h4>' +
          (item.tag ? '<span class="tag tag--' + item.tag + '">' + TAG_LABEL[item.tag] + '</span>' : '') +
        '</div>' +
        '<p class="dish__desc">' + esc(item.desc) + '</p>' +
        (item.weight ? '<span class="dish__weight">' + esc(item.weight) + '</span>' : '') +
      '</div>' +
      '<div class="dish__side"><span class="dish__price">' + money(item.price) + '</span>' + control + '</div>' +
    '</article>';
  }

  function renderMenu(cat, query, keepScroll) {
    currentCat = cat;
    currentQuery = query || '';
    const q = currentQuery.trim().toLowerCase();

    let list = RAVAT_MENU.filter((i) => (cat === 'all' || i.cat === cat));
    if (q) list = list.filter((i) => (i.name + ' ' + i.desc).toLowerCase().includes(q));

    const grid = $('#menuGrid');
    const empty = $('#menuEmpty');
    empty.hidden = list.length > 0;

    if (cat === 'all' && !q) {
      let html = '';
      RAVAT_CATEGORIES.filter((c) => c.id !== 'all').forEach((c) => {
        const items = list.filter((i) => i.cat === c.id);
        if (!items.length) return;
        html += '<div class="menu-group"><h3 class="menu-group__title">' + c.title + '</h3><div class="menu-group__grid">' + items.map(dishCard).join('') + '</div></div>';
      });
      grid.innerHTML = html;
    } else {
      grid.innerHTML = '<div class="menu-group"><div class="menu-group__grid">' + list.map(dishCard).join('') + '</div></div>';
    }

    $$('.tab', $('#tabs')).forEach((t) => {
      const on = t.dataset.cat === currentCat;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
  }

  function gotoCategory(cat) {
    const btn = $('.tab[data-cat="' + cat + '"]');
    renderMenu(cat, '');
    $('#menuSearch').value = '';
    currentQuery = '';
    if (btn) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    scrollToEl('#menu');
  }

  function scrollToEl(sel) {
    const el = $(sel);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - 76;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  /* ---------------- drawer ---------------- */
  function openDrawer() {
    $('#drawerOverlay').hidden = false;
    requestAnimationFrame(() => $('#drawerOverlay').classList.add('is-on'));
    $('#cartDrawer').classList.add('is-open');
    $('#cartDrawer').setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }
  function closeDrawer() {
    $('#cartDrawer').classList.remove('is-open');
    $('#cartDrawer').setAttribute('aria-hidden', 'true');
    $('#drawerOverlay').classList.remove('is-on');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { $('#drawerOverlay').hidden = true; }, 260);
  }

  /* ---------------- booking form ---------------- */
  function initForm() {
    const date = $('#fDate');
    const today = new Date();
    const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const min = iso(today);
    const maxD = new Date(today.getTime() + 90 * 864e5);
    date.min = min;
    date.max = iso(maxD);
    date.value = min;

    const pad = (n) => String(n).padStart(2, '0');
    const slots = [];
    for (let h = 11; h <= 23; h++) { slots.push(pad(h) + ':00'); slots.push(pad(h) + ':30'); }
    const tSel = $('#fTime');
    tSel.innerHTML = slots.map((t) => '<option value="' + t + '"' + (t === '19:00' ? ' selected' : '') + '>' + t + '</option>').join('');

    const gSel = $('#fGuests');
    let gOpts = '';
    for (let i = 1; i <= 12; i++) gOpts += '<option value="' + i + '"' + (i === 2 ? ' selected' : '') + '>' + i + ' ' + plural(i, 'гость', 'гостя', 'гостей') + '</option>';
    gOpts += '<option value="13+">Больше 12 — банкет</option>';
    gSel.innerHTML = gOpts;

    const phone = $('#fPhone');
    phone.addEventListener('input', () => {
      let d = phone.value.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (!d.startsWith('7')) d = '7' + d;
      d = d.slice(0, 11);
      let out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 5) out += ') ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);
      phone.value = out;
    });
  }

  function buildMessage(data) {
    const lines = [];
    lines.push('Здравствуйте! Хочу забронировать столик в чайхане ' + VENUE_NAME + '.');
    lines.push('');
    lines.push('Имя: ' + data.name);
    lines.push('Телефон: ' + data.phone);
    lines.push('Дата: ' + data.dateText);
    lines.push('Время: ' + data.time);
    lines.push('Гостей: ' + data.guests);
    lines.push('Зал: ' + data.zone);
    lines.push('Повод: ' + data.occasion);
    if (data.note) lines.push('Пожелания: ' + data.note);
    const lines2 = cartLines();
    if (lines2.length) {
      lines.push('');
      lines.push('Предзаказ:');
      lines2.forEach((l) => lines.push('• ' + l.item.name + ' — ' + l.qty + ' × ' + money(l.item.price)));
      lines.push('Итого предзаказ: ' + money(cartTotal()));
    }
    lines.push('');
    lines.push('Подтвердите, пожалуйста, бронь.');
    return lines.join('\n');
  }

  function validate() {
    const checks = [
      { el: $('#fName'), ok: $('#fName').value.trim().length >= 2 },
      { el: $('#fPhone'), ok: ($('#fPhone').value.replace(/\D/g, '').length === 11) },
      { el: $('#fDate'), ok: !!$('#fDate').value },
      { el: $('#fAgree'), ok: $('#fAgree').checked }
    ];
    let firstBad = null;
    checks.forEach((c) => {
      c.el.classList.toggle('is-invalid', !c.ok);
      if (!c.ok && !firstBad) firstBad = c.el;
    });
    if (firstBad) {
      firstBad.focus({ preventScroll: true });
      firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return !firstBad;
  }

  function submitBooking(e) {
    e.preventDefault();
    if (!validate()) { toast('Проверьте выделенные поля'); return; }

    const dateVal = $('#fDate').value;
    const d = new Date(dateVal + 'T12:00:00');
    const data = {
      name: $('#fName').value.trim(),
      phone: $('#fPhone').value.trim(),
      dateText: d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }),
      dateRaw: dateVal,
      time: $('#fTime').value,
      guests: $('#fGuests').value,
      zone: $('#fZone').value,
      occasion: $('#fOccasion').value,
      note: $('#fNote').value.trim(),
      order: cartLines().map((l) => ({ id: l.item.id, name: l.item.name, qty: l.qty, price: l.item.price })),
      total: cartTotal(),
      createdAt: new Date().toISOString()
    };

    const msg = buildMessage(data);
    const url = 'https://wa.me/' + VENUE_PHONE + '?text=' + encodeURIComponent(msg);

    try {
      const all = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]');
      all.push(data);
      localStorage.setItem(BOOKING_KEY, JSON.stringify(all.slice(-30)));
    } catch (err) { /* ignore */ }

    $('#waLink').href = url;
    $('#waLink').dataset.msg = msg;
    $('#bookingForm').hidden = true;
    $('#bookingSuccess').hidden = false;
    scrollToEl('#booking');

    const win = window.open(url, '_blank');
    if (!win) toast('Откройте WhatsApp кнопкой ниже');

    cart = {};
    saveCart();
    syncCartUI();
  }

  /* ---------------- init ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('#year').textContent = new Date().getFullYear();

    tabsBuild();
    renderMenu('all', '');
    initForm();
    syncCartUI();

    // menu interactions
    $('#menuGrid').addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      if (add) addToCart(add.dataset.add);
      else if (inc) changeQty(inc.dataset.inc, 1);
      else if (dec) changeQty(dec.dataset.dec, -1);
    });

    $('#tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-cat]');
      if (!tab) return;
      renderMenu(tab.dataset.cat, currentQuery);
      tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });

    let searchTimer;
    $('#menuSearch').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => renderMenu(currentCat, v), 140);
    });

    // signature cards -> menu category
    $$('[data-goto]').forEach((card) => {
      card.addEventListener('click', () => gotoCategory(card.dataset.goto));
    });

    // drawer
    $('#cartBtn').addEventListener('click', openDrawer);
    $('#openCart').addEventListener('click', openDrawer);
    $('#cartClose').addEventListener('click', closeDrawer);
    $('#drawerOverlay').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

    $('#cartItems').addEventListener('click', (e) => {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      const go = e.target.closest('[data-goto-tab]');
      if (inc) changeQty(inc.dataset.inc, 1);
      else if (dec) changeQty(dec.dataset.dec, -1);
      else if (go) { closeDrawer(); gotoCategory('all'); }
    });

    $('#cartCheckout').addEventListener('click', () => {
      closeDrawer();
      if (!$('#bookingSuccess').hidden) {
        $('#bookingSuccess').hidden = true;
        $('#bookingForm').hidden = false;
      }
      $('#booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => $('#fName').focus({ preventScroll: true }), 600);
    });

    $('#cartClear').addEventListener('click', () => {
      cart = {};
      saveCart();
      syncCartUI();
      toast('Предзаказ очищен');
    });

    $('#preorderAdd').addEventListener('click', () => {
      if (!$('#bookingSuccess').hidden) {
        $('#bookingSuccess').hidden = true;
        $('#bookingForm').hidden = false;
      }
      gotoCategory('all');
    });

    $$('[data-open-booking]').forEach((b) => b.addEventListener('click', () => {
      if (!$('#bookingSuccess').hidden) {
        $('#bookingSuccess').hidden = true;
        $('#bookingForm').hidden = false;
      }
      scrollToEl('#booking');
      setTimeout(() => $('#fName').focus({ preventScroll: true }), 600);
    }));

    $('#bookingForm').addEventListener('submit', submitBooking);
    $('#bookingForm').addEventListener('input', (e) => e.target.classList.remove('is-invalid'));

    $('#copyMsg').addEventListener('click', async () => {
      const msg = $('#waLink').dataset.msg || '';
      try {
        await navigator.clipboard.writeText(msg);
        toast('Сообщение скопировано');
      } catch (err) {
        toast('Не удалось скопировать — выделите текст вручную');
      }
    });

    $('#newBooking').addEventListener('click', () => {
      $('#bookingSuccess').hidden = true;
      $('#bookingForm').hidden = false;
      $('#bookingForm').reset();
      initForm();
      scrollToEl('#booking');
    });

    // header
    const header = $('#header');
    const onScroll = () => header.classList.toggle('is-stuck', window.pageYOffset > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // mobile nav
    const burger = $('#burger');
    const nav = $('#nav');
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });

    // reveal on scroll
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-visible');
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      $$('.reveal').forEach((el) => io.observe(el));
    } else {
      $$('.reveal').forEach((el) => el.classList.add('is-visible'));
    }
  });
})();
