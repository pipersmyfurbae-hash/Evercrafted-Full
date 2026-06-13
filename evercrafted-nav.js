/* Evercrafted shared chrome — one header nav + footer injected into every page.
   Self-contained styles (ec- prefixed) so it looks consistent regardless of the
   host page's CSS, and links the whole site from a single file. */
(function () {
  if (document.getElementById('ec-shared-style')) return;            // idempotent
  const HOME = 'evercrafted-marketing-site.html';
  const WAITLIST = HOME + '#waitlist';

  // ── Site map (chosen structure: public nav + tools in footer) ──────────────
  const NAV = [
    { label: 'How it works', href: 'evercrafted-how-it-works.html' },
    { label: 'Pricing',      href: 'evercrafted-pricing.html' },
    { label: 'Add-ons',      href: 'evercrafted-marketplace.html' },
    { label: 'About',        href: 'evercrafted-about.html' },
    { label: 'Try it',       href: 'evercrafted-try.html' },
  ];
  const PRODUCT = [
    { label: 'How it works', href: 'evercrafted-how-it-works.html' },
    { label: 'Pricing',      href: 'evercrafted-pricing.html' },
    { label: 'Add-ons',      href: 'evercrafted-marketplace.html' },
    { label: 'Memorial',     href: 'evercrafted-memorial.html' },
    { label: 'Try it',       href: 'evercrafted-try.html' },
    { label: 'Waitlist',     href: WAITLIST },
  ];
  const TOOLS = [
    { label: 'Memory Scene',       href: 'evercrafted-memory-scene.html' },
    { label: 'Commercial Creator', href: 'evercrafted-commercial-creator.html' },
    { label: 'Studio',             href: 'evercrafted-studio.html' },
    { label: 'Catalogue',          href: 'evercrafted-catalogue.html' },
    { label: 'Designs',            href: 'evercrafted-designs.html' },
    { label: 'Inventory Dashboard',href: 'evercrafted-inventory-dashboard.html' },
    { label: 'Floral Tagger',      href: 'evercrafted-floral-tagger.html' },
    { label: 'Build view',         href: 'evercrafted-build-view.html' },
  ];
  const COMPANY = [
    { label: 'About',   href: 'evercrafted-about.html' },
    { label: 'Privacy', href: '#' },
    { label: 'Terms',   href: '#' },
  ];

  const css = `
  .ec-nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;
    padding:14px clamp(16px,4vw,48px);background:#F9F7F4;border-bottom:1px solid #E4DFD8;
    font-family:'Inter',system-ui,sans-serif;position:relative;z-index:9000}
  .ec-nav a{text-decoration:none}
  .ec-logo{font-family:'Italiana',Georgia,serif;font-size:1.35rem;color:#2c2a26;letter-spacing:.02em}
  .ec-logo b{font-weight:400}.ec-logo .g{color:#4a6741}
  .ec-links{display:flex;align-items:center;gap:clamp(.8rem,2vw,1.7rem);flex-wrap:wrap;justify-content:flex-end}
  .ec-links a{font-size:13px;color:#6b6258;letter-spacing:.02em;transition:color .15s}
  .ec-links a:hover{color:#4a6741}
  .ec-cta{padding:9px 18px;border-radius:100px;background:#4a6741;color:#fff!important;
    font-size:12px;font-weight:600;letter-spacing:.05em}
  .ec-cta:hover{background:#3c5435}
  .ec-foot{background:#3A5532;color:rgba(255,255,255,.6);font-family:'Inter',system-ui,sans-serif;
    padding:clamp(2.75rem,5vw,3.5rem) clamp(16px,4vw,48px) 1.75rem}
  .ec-foot-top{display:grid;grid-template-columns:2.4fr 1fr 1fr;gap:clamp(1.5rem,3vw,3rem);
    max-width:1200px;margin:0 auto 2.5rem;padding-bottom:2.5rem;border-bottom:1px solid rgba(255,255,255,.1)}
  @media(max-width:768px){.ec-foot-top{grid-template-columns:1fr 1fr}}
  @media(max-width:480px){.ec-foot-top{grid-template-columns:1fr}}
  .ec-foot-brand{font-family:'Italiana',Georgia,serif;font-size:1.4rem;font-weight:400;color:#fff;margin-bottom:.75rem}
  .ec-foot-brand .g{color:#C4A06A}
  .ec-foot-tag{font-size:13px;line-height:1.65;color:rgba(255,255,255,.45);max-width:300px}
  .ec-foot-h{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:.9rem}
  .ec-foot ul{list-style:none;padding:0;margin:0}
  .ec-foot li{margin-bottom:.5rem}
  .ec-foot a{color:rgba(255,255,255,.55);text-decoration:none;font-size:13px;transition:color .2s ease}
  .ec-foot a:hover{color:#fff}
  .ec-foot-bot{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;
    max-width:1200px;margin:0 auto;font-size:12px;color:rgba(255,255,255,.35)}
  .ec-foot-bot a{color:rgba(255,255,255,.35);margin-left:1.25rem;text-decoration:none;transition:color .2s ease}
  .ec-foot-bot a:hover{color:rgba(255,255,255,.6)}
  `;
  // Guarantee the brand fonts on every page (tool pages may not import them)
  if (!document.querySelector('link[href*="Italiana"]')) {
    const f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Italiana&family=Inter:wght@300;400;500;600&display=swap';
    document.head.appendChild(f);
  }
  const st = document.createElement('style');
  st.id = 'ec-shared-style'; st.textContent = css;
  document.head.appendChild(st);

  const link = i => `<a href="${i.href}">${i.label}</a>`;

  // ── Header — only inject if the page doesn't already have its own nav ───────
  // (avoids double navs on pages that ship their own). Every page still gets the
  // shared footer below, which is what links the whole site + the waitlist CTA.
  if (!document.querySelector('nav')) {
    const nav = document.createElement('nav');
    nav.className = 'ec-nav'; nav.id = 'ec-shared-nav';
    nav.innerHTML =
      `<a class="ec-logo" href="${HOME}"><b>Ever</b><span class="g">crafted</span></a>` +
      `<div class="ec-links">${NAV.map(link).join('')}` +
      `<a href="evercrafted-account.html">Account</a>` +
      `<a class="ec-cta" href="${WAITLIST}">Join waitlist</a></div>`;
    document.body.insertBefore(nav, document.body.firstChild);
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const col = (h, items) => `<div><div class="ec-foot-h">${h}</div><ul>${items.map(i => `<li>${link(i)}</li>`).join('')}</ul></div>`;
  const foot = document.createElement('footer');
  foot.className = 'ec-foot'; foot.id = 'ec-shared-foot';
  foot.innerHTML =
    `<div class="ec-foot-top">
      <div>
        <div class="ec-foot-brand"><a href="${HOME}" style="color:inherit;text-decoration:none">Ever<span class="g">crafted</span></a></div>
        <div class="ec-foot-tag">The design system for faux botanical wreath artists. Turn a feeling into something you can build.</div>
      </div>
      ${col('Product', PRODUCT)}
      ${col('Company', COMPANY)}
    </div>
    <div class="ec-foot-bot">
      <span>© 2025 Evercrafted Studio. All rights reserved.</span>
      <div><a href="#">Instagram</a><a href="#">Pinterest</a><a href="#">Email</a></div>
    </div>`;
  document.body.appendChild(foot);
})();
