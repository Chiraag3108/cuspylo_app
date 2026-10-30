const $ = s => document.querySelector(s), A = $('#app');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

let cfg = { slots: [], price: 50, defaultPrice: 50 };
let token = localStorage.t || '';
let role = localStorage.r || '';
let user = JSON.parse(localStorage.u || 'null');

let cart = JSON.parse(localStorage.cart || '[]');
let sel = new Set();
let after = 'dash';
let timer;

const api = async (p, b) => {
  const r = await fetch('/api' + p, {
    method: b ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: b ? JSON.stringify(b) : undefined
  });

  const d = await r.json().catch(() => ({}));

  if (!r.ok) throw new Error(d.error || 'Something went wrong');

  return d;
};

const toast = m => {
  const t = $('#toast');
  t.textContent = m;
  t.className = 'on';
  setTimeout(() => t.className = '', 2600);
};

const hr = h => (h % 12 || 12) + (h < 12 ? ' AM' : ' PM');

const saveCart = () => {
  localStorage.cart = JSON.stringify(cart);
  $('#cc').textContent = cart.length;
};

const setAuth = (d, r) => {
  token = d.token;
  role = r;
  user = d.user || null;

  localStorage.t = token;
  localStorage.r = r;
  localStorage.u = JSON.stringify(user);
  localStorage.seen = 1;

  head();
};

const logout = () => {
  token = role = '';
  user = null;

  ['t', 'r', 'u'].forEach(k => localStorage.removeItem(k));

  head();
  go('home');
};

const head = () => {
  $('#who').innerHTML = role
    ? `<button class="btn sm alt" onclick="go('account')">${esc(role === 'admin' ? 'Admin' : (user?.name || 'Account'))}</button>
       <button class="btn sm" onclick="logout()">Log out</button>`
    : `<button class="btn sm" onclick="go('auth')">Sign in</button>`;
};


// IST PRICING

const istHour = () => Number(
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23'
  }).format(new Date())
);

const nowPrice = () => {
  const h = istHour();

  return h >= 9 && h < 12
    ? 49
    : h >= 12 && h < 15
      ? 50
      : 52;
};


function go(v) {
  clearInterval(timer);
  scrollTo(0, 0);

  if (v === 'dash' && !role) localStorage.seen = '1';

  (views[v] || views.home)();
  saveCart();
}


// PAGE VIEWS

const views = {

  // HOME

  home() {
    if (role === 'user') return go('dash');
    if (role === 'admin') return go('admin');
    if (localStorage.seen) return go('dash');

    A.innerHTML = `
      <section class="glass founder">
        <img src="logo.png" alt="CUSPYLO"
          style="width:min(100%,340px);margin-bottom:18px">

        <h1>${esc(SITE.founderTitle)}</h1>

        <p>${esc(SITE.founderNote)}</p>

        <div class="row">
          <button class="btn teal" onclick="go('dash')">
            Explore the site
          </button>

          <button class="btn" onclick="go('auth')">
            Sign in
          </button>
        </div>
      </section>
    `;
  },


  // LOGIN AND SIGNUP

  auth(mode = 'login') {
    const su = mode === 'signup';

    A.innerHTML = `
      <section class="glass" style="max-width:480px;margin:5vh auto">

        <h2>${su ? 'Create your student account' : 'Welcome back'}</h2>

        <p class="mut">Student access for the CUSPYLO store.</p>

        <br>

        <form id="af">

          ${su ? `
            <input name="name" placeholder="Full name" required>
            <input name="phone" placeholder="Mobile number" required>
            <input name="email" type="email" placeholder="Email (optional)">
            <input name="college" placeholder="College (e.g. KCDS)" required>
          ` : ''}

          <input name="username" placeholder="Username" required>

          <input name="password" type="password"
            placeholder="Password (min 6 characters)" required>

          <button class="btn" style="width:100%">
            ${su ? 'Create account' : 'Sign in'}
          </button>

        </form>

        <p class="mut c" style="margin-top:14px">
          ${su ? 'Already registered?' : 'New to CUSPYLO?'}

          <a href="#"
            onclick="views.auth('${su ? 'login' : 'signup'}');return false">

            ${su ? 'Sign in' : 'Create account'}

          </a>
        </p>

      </section>
    `;

    $('#af').onsubmit = async e => {
      e.preventDefault();

      try {
        setAuth(
          await api(
            su ? '/signup' : '/login',
            Object.fromEntries(new FormData(e.target))
          ),
          'user'
        );

        toast(su ? 'Account created' : 'Signed in');

        go(after);
        after = 'dash';

      } catch (x) {
        toast(x.message);
      }
    };
  },


  // DASHBOARD

  dash() {
    A.innerHTML = `
      <section class="hero-video">

  <video class="hero-background"
         autoplay
         muted
         loop
         playsinline
         preload="auto">

    <source src="./assets/videos/hero-animation.mp4" type="video/mp4">

  </video>

  <div class="hero-overlay">

    <span class="eyebrow">BUILT FOR DENTAL STUDENTS</span>

    <h1>Everything your dental journey needs.</h1>

    <p>${esc(SITE.banner)}</p>

  </div>

</section>

      <div class="grid">

        ${SITE.dashboard.map(t => `
          <button class="tile ${t.live ? '' : 'off'}"
            onclick="${t.live ? "go('store')" : "toast(SITE.comingSoon)"}">

            <img class="tile-image"
     src="${t.image}"
     alt="${esc(t.title)}">

            <h3>${esc(t.title)}</h3>

            <span>${esc(t.sub)}</span>

          </button>
        `).join('')}

        <button class="tile" onclick="go('account')">

          <i>👤</i>

          <h3>My account</h3>

          <span>Profile and your orders</span>

        </button>

      </div>
    `;
  },


  // DENTAL STORE

  store() {

    const h = istHour();

    const slides = [
      { price: 49, from: 9, to: 12, label: '9 AM – 12 PM' },
      { price: 50, from: 12, to: 15, label: '12 PM – 3 PM' },
      { price: 52, from: 15, to: 9, label: '3 PM – 9 AM' }
    ].map(s => ({
      ...s,

      on: s.from < s.to
        ? h >= s.from && h < s.to
        : h >= s.from || h < s.to
    }));

    A.innerHTML = `

      <div class="search">

        <input id="q"
          placeholder="Search tooth name or FDI number (e.g. molar, 36)">

        <button class="btn" onclick="find()">Search</button>

      </div>


      <section class="poster poster-video">

  <video class="poster-background" autoplay muted loop playsinline preload="auto">
    <source src="assets/videos/dental-store.mp4" type="video/mp4">
  </video>

  <div class="poster-shade"></div>

  <div class="poster-content">

    <span class="poster-tag">MADE FOR DENTAL STUDENTS</span>

    <h1>Get your typo teeth at ₹${nowPrice()}</h1>

    <p>Quality practical teeth. Easy ordering. Pay on delivery.</p>

    <div class="poster-price">
      <span>₹${nowPrice()}</span>
      <span>per tooth</span>
      <small>Live IST pricing</small>
    </div>

    <a class="btn teal poster-cta"
       href="#pick"
       onclick="document.getElementById('pick').scrollIntoView({behavior:'smooth'});return false">
      Grab your teeth →
    </a>

  </div>

</section>


      <section class="sec" id="pick">

        <h2>Choose your teeth</h2>

        <p class="mut">
          Select one or more teeth using FDI numbering. Tap again to remove.
        </p>

        <div class="jawbox">

          <h3 class="c">MAXILLARY · UPPER JAW</h3>

          <div class="jaw" id="ju"></div>

          <h3 class="c">MANDIBULAR · LOWER JAW</h3>

          <div class="jaw" id="jl"></div>

        </div>

        <div class="bar">

          <div>
            <b id="sc">0 teeth</b> ·
            <span id="st">₹0</span>
          </div>

          <div class="row">

            <button class="btn alt" onclick="addCart(false)">
              Add to cart
            </button>

            <button class="btn" onclick="addCart(true)">
              Buy now
            </button>

          </div>

        </div>

      </section>


      <section class="sec glass">

        <h2>Can't find a product? Request it</h2>

        <form id="rf">

          <input name="product" placeholder="Product name" required>

          <label class="mut">Product image (optional)</label>

          <input type="file" name="img"
            accept="image/png,image/jpeg,image/webp">

          <p class="mut">
            Delivery charges may apply. We will contact you soon.
          </p>

          <button class="btn teal">Send product request</button>

        </form>

      </section>
    `;


    let i = Math.max(0, slides.findIndex(s => s.on));

    const s = A.querySelectorAll('.slide');

    timer = setInterval(() => {
      s[i].classList.remove('on');

      i = (i + 1) % s.length;

      s[i].classList.add('on');

    }, 2800);


    jaw(
      $('#ju'),
      [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28],
      false
    );

    jaw(
      $('#jl'),
      [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38],
      true
    );


    $('#q').onkeydown = e => e.key === 'Enter' && find();

    sum();


    // PRODUCT REQUEST

    $('#rf').onsubmit = async e => {
      e.preventDefault();

      if (role !== 'user') {
        after = 'store';
        toast('Please sign in first');
        return go('auth');
      }

      const f = e.target;
      const file = f.img.files[0];

      let image = '';

      if (file) {

        if (file.size > 1.5e6) {
          return toast('Image must be under 1.5 MB');
        }

        image = await new Promise(resolve => {
          const x = new FileReader();

          x.onload = () => resolve(x.result);

          x.readAsDataURL(file);
        });
      }

      try {
        await api('/requests', {
          product: f.product.value,
          image,
          phone: user?.phone
        });

        f.reset();

        toast('Request sent. We will contact you soon.');

      } catch (x) {
        toast(x.message);
      }
    };
  },


  // CART AND CHECKOUT

  cart() {

    const p = nowPrice();
    const n = cart.length;

    if (!n) {

      A.innerHTML = `
        <section class="glass c">

          <h2>Your cart is empty</h2>

          <br>

          <button class="btn" onclick="go('store')">
            Browse teeth
          </button>

        </section>
      `;

      return;
    }

    A.innerHTML = `

      <div class="two">

        <section class="glass">

          <h2>Delivery details</h2>

          <p class="mut">
            Confirm where you want your order delivered.
          </p>

          <br>

          <form id="of">

            <input name="name" placeholder="Full name"
              value="${esc(user?.name)}" required>

            <input name="phone" placeholder="Phone number"
              value="${esc(user?.phone)}" required>

            <input name="email" type="email" placeholder="Email"
              value="${esc(user?.email)}">

            <input name="college" placeholder="Deliver to which college?"
              value="${esc(user?.college)}" required>

            <textarea name="address" rows="3"
              placeholder="Full delivery address / department / room details"></textarea>

            <h3>Payment method</h3>

            <label class="pay">
              <input type="radio" name="payment" checked disabled>
              Cash on delivery (COD)
            </label>

            <label class="pay" style="opacity:.5">
              <input type="radio" disabled>
              UPI — coming soon
            </label>

            <button class="btn teal" style="width:100%;margin-top:8px">
              Confirm order
            </button>

          </form>

        </section>


        <section class="glass">

          <h2>Order summary</h2>

          <br>

          ${cart.map(t => `
            <p style="display:flex;justify-content:space-between">

              Tooth ${t}

              <span>
                ₹${p}

                <a href="#" onclick="rm(${t});return false">
                  Remove
                </a>
              </span>

            </p>
          `).join('')}

          <hr style="margin:12px 0;border:0;border-top:1px solid #e1eaf4">

          <h3 style="display:flex;justify-content:space-between">

            Total

            <span>₹${p * n}</span>

          </h3>

          <p class="mut">
            Delivery charges may apply. Final price is confirmed when you place the order.
          </p>

        </section>

      </div>
    `;


    $('#of').onsubmit = async e => {
      e.preventDefault();

      if (role !== 'user') {
        after = 'cart';
        toast('Please sign in to place your order');
        return go('auth');
      }

      try {

        const data = Object.fromEntries(new FormData(e.target));

        const o = await api('/orders', {
          ...data,
          items: cart
        });

        cart = [];

        saveCart();

        done(o);

      } catch (x) {
        toast(x.message);
      }
    };
  },


  // STUDENT ACCOUNT AND ORDER HISTORY

  async account() {

    if (role !== 'user') {
      after = 'account';
      return go('auth');
    }

    let orders = [];

    try {
      orders = (await api('/my/orders')).orders;
    } catch (e) {
      toast(e.message);
    }

    A.innerHTML = `

      <section class="glass">

        <h2>My account</h2>

        <p>
          <b>${esc(user?.name)}</b> · ${esc(user?.college)}
        </p>

        <p class="mut">
          ${esc(user?.phone)} ${esc(user?.email)}
        </p>

        <br>

        <h3>Your orders</h3>

        ${orders.length
          ? orders.map(o => `
              <div class="orderline">

                <b>${esc(o.invoice)}</b> ·
                ${o.items.map(n => 'Tooth ' + n).join(', ')}

                <br>

                ₹${o.total} · ${esc(o.status)} ·
                ${new Date(o.date).toLocaleString('en-IN')}

              </div>
            `).join('')
          : '<p class="mut">No orders yet.</p>'
        }

        <br>

        <button class="btn" onclick="go('store')">
          Shop teeth
        </button>

      </section>
    `;
  },


  // ADMIN PORTAL

  async admin() {

    if (role !== 'admin') {

      A.innerHTML = `

        <section class="glass"
          style="max-width:420px;margin:6vh auto">

          <h2>Admin sign in</h2>

          <p class="mut">
            Private access for the CUSPYLO owner.
          </p>

          <br>

          <form id="ad">

            <input name="id" placeholder="Admin ID" required>

            <input name="password" type="password"
              placeholder="Password" required>

            <button class="btn" style="width:100%">
              Sign in
            </button>

          </form>

        </section>
      `;

      $('#ad').onsubmit = async e => {
        e.preventDefault();

        try {
          setAuth(
            await api('/admin/login', Object.fromEntries(new FormData(e.target))),
            'admin'
          );

          go('admin');

        } catch (x) {
          toast(x.message);
        }
      };

      return;
    }


    let d;

    try {
      d = await api('/admin/data');
    } catch (e) {
      toast(e.message);
      return logout();
    }

    window.AD = d;

    const date = x => new Date(x).toLocaleString('en-IN');


    const tabs = {

      Orders: `
        <div class="sc">

          <table>

            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Teeth</th>
              <th>Total</th>
              <th>Date</th>
              <th></th>
            </tr>

            ${d.orders.map((o, i) => `
              <tr>

                <td>${esc(o.invoice)}</td>

                <td>
                  ${esc(o.name)}<br>
                  ${esc(o.phone)}<br>
                  ${esc(o.college)}<br>
                  <small>${esc(o.address)}</small>
                </td>

                <td>${o.items.join(', ')}</td>

                <td>
                  ₹${o.total}<br>
                  <small>${o.payment}</small>
                </td>

                <td>${date(o.date)}</td>

                <td>
                  <button class="btn sm" onclick="inv(${i})">
                    Invoice
                  </button>
                </td>

              </tr>
            `).join('') || '<tr><td colspan="6">No orders yet</td></tr>'}

          </table>

        </div>
      `,


      Requests: `
        <div class="sc">

          <table>

            <tr>
              <th>Product</th>
              <th>Image</th>
              <th>User</th>
              <th>Phone</th>
              <th>Date</th>
            </tr>

            ${d.requests.map(r => `
              <tr>

                <td>${esc(r.product)}</td>

                <td>
                  ${r.image
                    ? `<img src="${esc(r.image)}" width="70" alt="request image">`
                    : '—'
                  }
                </td>

                <td>${esc(r.username)}</td>

                <td>${esc(r.phone)}</td>

                <td>${date(r.date)}</td>

              </tr>
            `).join('') || '<tr><td colspan="5">No requests yet</td></tr>'}

          </table>

        </div>
      `,


      Feedback: `
        <div class="sc">

          <table>

            <tr>
              <th>From</th>
              <th>Message</th>
              <th>Date</th>
            </tr>

            ${d.feedback.map(f => `
              <tr>

                <td>
                  ${esc(f.name)}<br>
                  <small>${esc(f.contact)}</small>
                </td>

                <td>${esc(f.message)}</td>

                <td>${date(f.date)}</td>

              </tr>
            `).join('') || '<tr><td colspan="3">No feedback yet</td></tr>'}

          </table>

        </div>
      `
    };


    A.innerHTML = `

      <h2>Admin portal</h2>

      <p class="mut">
        Only orders, invoices, product requests and feedback are shown here.
      </p>

      <br>

      <div class="tabs">

        ${Object.keys(tabs).map((k, i) => `
          <button class="btn ${i ? '' : 'on'}" data-k="${k}">
            ${k} (${d[k.toLowerCase()].length})
          </button>
        `).join('')}

      </div>

      <div id="tb">
        ${tabs.Orders}
      </div>
    `;


    A.querySelectorAll('.tabs .btn').forEach(b => {

      b.onclick = () => {

        A.querySelectorAll('.tabs .btn').forEach(x =>
          x.classList.remove('on')
        );

        b.classList.add('on');

        $('#tb').innerHTML = tabs[b.dataset.k];
      };

    });
  }

};


// ORDER CONFIRMATION

function done(o) {

  A.innerHTML = `

    <section class="glass c"
      style="max-width:560px;margin:6vh auto">

      <h1>Order confirmed 🎉</h1>

      <p class="mut">
        Invoice ${esc(o.invoice)} ·
        Teeth ${o.items.join(', ')} ·
        ₹${o.total} · Cash on delivery
      </p>

      <br>

      <p>We will contact you on ${esc(o.phone)} soon.</p>

      <br>

      <button class="btn" onclick="go('account')">
        View my orders
      </button>

    </section>
  `;
}


// FDI TOOTH SELECTION

function jaw(el, nums, low) {

  nums.forEach((n, i) => {

    const t = i / 15;
    const b = document.createElement('button');

    b.className = 't' + (low ? ' low' : '');
    b.textContent = n;
    b.dataset.n = n;
    b.title = 'Tooth ' + n + ' (' + kind(n) + ')';

    b.style.left = 50 - 44 * Math.cos(Math.PI * t) + '%';

    b.style.top = (
      low
        ? 14 + 72 * Math.sin(Math.PI * t)
        : 86 - 72 * Math.sin(Math.PI * t)
    ) + '%';

    b.onclick = () => {

      sel.has(n) ? sel.delete(n) : sel.add(n);

      b.classList.toggle('sel');

      sum();
    };

    el.append(b);
  });
}


const kind = n => {

  const d = Number(n) % 10;

  return d < 3
    ? 'incisor'
    : d === 3
      ? 'canine'
      : d < 6
        ? 'premolar'
        : 'molar';
};


// CART TOTAL

function sum() {

  if ($('#sc')) {

    $('#sc').textContent = sel.size + ' teeth';

    $('#st').textContent = '₹' + sel.size * nowPrice();
  }
}


// TOOTH SEARCH

function find() {

  const q = $('#q').value.trim().toLowerCase();

  document.querySelectorAll('.t').forEach(b => {

    b.classList.toggle(
      'hit',
      !!q && (
        b.dataset.n === q ||
        kind(b.dataset.n).startsWith(q.replace(/s$/, ''))
      )
    );

  });

  const h = document.querySelector('.hit');

  h
    ? $('#pick').scrollIntoView()
    : toast('No tooth matched. Try an FDI number or tooth type.');
}


// ADD TO CART

function addCart(buy) {

  if (!sel.size) return toast('Select at least one tooth');

  sel.forEach(n => {
    if (!cart.includes(n)) cart.push(n);
  });

  sel.clear();

  saveCart();

  if (buy) {
    go('cart');
  } else {

    toast('Added to cart');

    document.querySelectorAll('.t.sel').forEach(b =>
      b.classList.remove('sel')
    );

    sum();
  }
}


// REMOVE FROM CART

function rm(n) {

  cart = cart.filter(x => x !== n);

  go('cart');
}


// ADMIN INVOICE

function inv(i) {

  const o = AD.orders[i];

  const w = window.open('', '_blank');

  if (!w) return toast('Allow pop-ups to print the invoice.');

  w.document.write(`

    <title>${esc(o.invoice)}</title>

    <body style="font-family:Arial;max-width:650px;margin:30px auto">

      <h1>CUSPYLO — Invoice</h1>

      <p>
        Invoice: ${esc(o.invoice)}<br>
        Date: ${new Date(o.date).toLocaleString('en-IN')}
      </p>

      <p>
        <b>${esc(o.name)}</b><br>
        ${esc(o.phone)} · ${esc(o.email)}<br>
        ${esc(o.college)}<br>
        ${esc(o.address)}
      </p>

      <table border="1" cellpadding="8"
        style="border-collapse:collapse;width:100%">

        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>

        ${o.items.map(t => `
          <tr>
            <td>Tooth ${t}</td>
            <td>1</td>
            <td>₹${o.unit}</td>
            <td>₹${o.unit}</td>
          </tr>
        `).join('')}

        <tr>
          <td colspan="3" align="right">
            <b>Total</b>
          </td>
          <td><b>₹${o.total}</b></td>
        </tr>

      </table>

      <p>Payment: Cash on delivery</p>

      <script>
        window.print()
      <\/script>

    </body>
  `);

  w.document.close();
}


// FEEDBACK FORM

$('#fb').onsubmit = async e => {

  e.preventDefault();

  try {

    await api('/feedback', Object.fromEntries(new FormData(e.target)));

    e.target.reset();

    toast('Thanks for your feedback!');

  } catch (x) {
    toast(x.message);
  }
};


// INITIALIZE APPLICATION

(async () => {

  try {
    cfg = await api('/config');
  } catch (e) {
    toast('Could not connect to CUSPYLO backend.');
  }

  const waNumber = String(cfg.whatsapp || '').replace(/\D/g, '');

  const wa = waNumber.length >= 10
    ? 'https://wa.me/' + waNumber + '?text=Hi%20CUSPYLO'
    : '#contact';

  $('#wa').href = $('#wa2').href = wa;

  $('#em').textContent = cfg.email || '';

  head();

  go(
    role === 'admin'
      ? 'admin'
      : role === 'user'
        ? 'dash'
        : 'home'
  );

})();