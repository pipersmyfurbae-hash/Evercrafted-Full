/* Evercrafted TierGate — vanilla port of the Academy scaffold's TierGate.tsx + tier.ts.
   The reusable entitlement spine for every marketplace app in the Express/HTML stack:
   one <script> + one ECGate.require({...}) call gates a page behind a tier and/or pack.
   Locked features are BLURRED with an upgrade CTA — never hidden (the Academy rule).

   Usage (at the end of any app page):
     <script src="/evercrafted-tier-gate.js"></script>
     <script>ECGate.require({ pack:'sell', title:'The Pricing Calculator',
       description:'Part of the Sell & Market pack.' });</script>
*/
(function (w) {
  var TIER_RANK = { bloom: 1, craft: 2, studio: 3, atelier: 4 };
  var TIER_LABEL = { bloom: 'Bloom', craft: 'Craft', studio: 'Studio', atelier: 'Atelier' };
  function rank(t) { return TIER_RANK[t] || 1; }

  function overlay(o) {
    var d = document.createElement('div');
    d.id = 'ec-gate-overlay';
    d.innerHTML =
      '<style>' +
      '@import url("https://fonts.googleapis.com/css2?family=Italiana&family=Inter:wght@300;400;500;600&display=swap");' +
      '#ec-gate-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(253,252,250,.6);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);font-family:Inter,system-ui,sans-serif}' +
      '#ec-gate-overlay .card{max-width:420px;text-align:center;background:#fff;border:1px solid #ece3d2;border-radius:20px;' +
      'padding:2.4rem 2rem;box-shadow:0 30px 70px rgba(90,68,32,.18)}' +
      '#ec-gate-overlay .mark{font-size:1.6rem;color:#46663E}' +
      '#ec-gate-overlay h2{font-family:Italiana,Georgia,serif;font-weight:400;font-size:1.7rem;color:#2B2A24;margin:.6rem 0 .5rem;letter-spacing:.01em}' +
      '#ec-gate-overlay p{font-size:.95rem;color:#6E6755;line-height:1.6;margin-bottom:1.5rem}' +
      '#ec-gate-overlay a{display:inline-block;padding:13px 28px;border-radius:100px;background:#46663E;color:#fff;' +
      'font-size:13px;font-weight:600;letter-spacing:.04em;text-decoration:none}' +
      '#ec-gate-overlay .sub{margin-top:1rem;font-size:12px;color:#9b917c}' +
      '</style>' +
      '<div class="card"><div class="mark">✦</div>' +
      '<h2>' + (o.title || 'A locked feature') + '</h2>' +
      '<p>' + (o.description || '') + (o.pack
        ? ' Add the <strong>' + o.pack + '</strong> pack to unlock it.'
        : ' Upgrade to <strong>' + TIER_LABEL[o.tier] + '</strong> to unlock it.') + '</p>' +
      '<a href="' + (o.href || '/evercrafted-marketplace.html') + '">' +
        (o.pack ? 'Add the ' + o.pack + ' pack' : 'Unlock with ' + TIER_LABEL[o.tier]) + ' →</a>' +
      '<div class="sub">Locked, not hidden — this is exactly what unlocks.</div></div>';
    document.body.appendChild(d);
    // soft-blur the page behind the overlay
    [].forEach.call(document.body.children, function (el) {
      if (el.id !== 'ec-gate-overlay') { el.style.filter = 'blur(4px)'; el.style.pointerEvents = 'none'; el.style.userSelect = 'none'; }
    });
  }

  w.ECGate = {
    rank: rank,
    // Resolve the current user's entitlements (server reads the authed profile in prod).
    entitlements: function () {
      return fetch('/api/entitlements' + w.location.search, { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .catch(function () { return { tier: 'bloom', packs: [] }; });
    },
    // Gate the whole page. Resolves true if entitled; otherwise renders the blur overlay.
    require: function (opts) {
      opts = opts || {};
      return this.entitlements().then(function (ent) {
        var packOk = opts.pack ? (ent.packs || []).indexOf(opts.pack) >= 0 : true;
        var tierOk = opts.tier ? rank(ent.tier) >= rank(opts.tier) : true;
        if (packOk && tierOk) return true;
        if (document.body) overlay(opts);
        else document.addEventListener('DOMContentLoaded', function () { overlay(opts); });
        return false;
      });
    },
  };
})(window);
