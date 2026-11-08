(function () {
    'use strict';
    const planetMarkup = `<svg class="web-planet" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 520" fill="none">
  <defs>
    <radialGradient id="body" cx=".28" cy=".2" r=".82">
      <stop stop-color="#393d43"/><stop offset=".38" stop-color="#181b20"/><stop offset=".76" stop-color="#080a0e"/><stop offset="1" stop-color="#020305"/>
    </radialGradient>
    <linearGradient id="silver" x1="86" y1="260" x2="734" y2="260" gradientUnits="userSpaceOnUse">
      <stop stop-color="#858d97" stop-opacity=".35"/><stop offset=".24" stop-color="#cbd0d6"/><stop offset=".56" stop-color="#f1f2ee"/><stop offset="1" stop-color="#a9b0ba" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="limb" x1="320" y1="160" x2="486" y2="365" gradientUnits="userSpaceOnUse">
      <stop stop-color="#e1e5e8" stop-opacity=".46"/><stop offset=".48" stop-color="#b4beca" stop-opacity=".08"/><stop offset="1" stop-color="#69727e" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="planet-disc"><circle cx="410" cy="260" r="125"/></clipPath>
    <linearGradient id="bands" x1="290" y1="200" x2="530" y2="290" gradientUnits="userSpaceOnUse">
      <stop stop-color="#a2adb9" stop-opacity=".08"/><stop offset=".35" stop-color="#99a5b2" stop-opacity=".42"/><stop offset=".7" stop-color="#7c8796" stop-opacity=".19"/><stop offset="1" stop-color="#6e7786" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shade" x1="300" y1="220" x2="530" y2="300" gradientUnits="userSpaceOnUse">
      <stop stop-color="#020305" stop-opacity="0"/><stop offset=".65" stop-color="#020305" stop-opacity=".12"/><stop offset="1" stop-color="#020305" stop-opacity=".7"/>
    </linearGradient>
  </defs>
  <!-- Three ring groups share the same perspective, with deliberate band gaps. -->
  <g transform="rotate(-19 410 260)" stroke="url(#silver)" opacity=".38">
    <ellipse cx="414" cy="260" rx="328" ry="107" stroke-width="1"/>
    <ellipse cx="414" cy="260" rx="319" ry="104" stroke-width="2"/>
    <ellipse cx="414" cy="260" rx="307" ry="100" stroke-width="5"/>
    <ellipse cx="414" cy="260" rx="297" ry="96" stroke-width="1"/>
    <ellipse cx="414" cy="260" rx="280" ry="90" stroke-width="3"/>
    <ellipse cx="414" cy="260" rx="272" ry="87" stroke-width="1"/>
    <ellipse cx="414" cy="260" rx="260" ry="83" stroke-width="6"/>
    <ellipse cx="414" cy="260" rx="247" ry="79" stroke-width="1"/>
    <ellipse cx="414" cy="260" rx="234" ry="74" stroke-width="2"/>
  </g>
  <circle cx="410" cy="260" r="126" fill="url(#body)"/>
  <g clip-path="url(#planet-disc)" stroke="url(#bands)" stroke-linecap="round">
    <g class="planet-bands-soft" opacity=".3">
      <path d="M279 164C341 180 367 204 423 201S502 175 550 169" stroke-width="12"/>
      <path d="M274 284C340 299 360 323 414 322S492 308 544 286" stroke-width="17" opacity=".7"/>
    </g>
    <g class="planet-bands-slow" opacity=".74">
      <path d="M270 192C333 213 369 239 417 236S503 225 550 199" stroke-width="10" opacity=".85"/>
      <path d="M269 249C325 270 375 291 425 287S505 264 552 254" stroke-width="13"/>
      <path d="M290 318C347 337 374 352 424 348S490 337 535 318" stroke-width="7" opacity=".65"/>
    </g>
    <g class="planet-bands-accent" opacity=".48">
      <path d="M305 207C352 229 389 244 432 239S456 234 474 229" stroke-width="2"/>
      <path d="M329 219C372 238 396 248 448 242" stroke-width="3" opacity=".55"/>
      <path d="M331 349C375 368 416 373 478 352" stroke-width="2" opacity=".6"/>
    </g>
  </g>
  <circle cx="410" cy="260" r="126" fill="url(#shade)"/>
  <circle cx="410" cy="260" r="126" stroke="url(#limb)" stroke-width="2"/>
  <path d="M298 208a126 126 0 0 1 163-64" stroke="#e9ecee" stroke-opacity=".16" stroke-width="3"/>
  <g transform="rotate(-19 410 260)" stroke="url(#silver)">
    <g opacity=".82">
      <path d="M86 260a328 107 0 0 0 656 0"/>
      <path d="M95 260a319 104 0 0 0 638 0" stroke-width="2"/>
      <path d="M107 260a307 100 0 0 0 614 0" stroke-width="5"/>
      <path d="M117 260a297 96 0 0 0 594 0"/>
    </g>
    <g opacity=".65">
      <path d="M134 260a280 90 0 0 0 560 0" stroke-width="3"/>
      <path d="M142 260a272 87 0 0 0 544 0"/>
      <path d="M154 260a260 83 0 0 0 520 0" stroke-width="6"/>
      <path d="M167 260a247 79 0 0 0 494 0"/>
      <path d="M180 260a234 74 0 0 0 468 0" stroke-width="2"/>
    </g>
  </g>
</svg>`;
    function diagram(mobile) {
        const layout = mobile
            ? { view:'0 0 320 205', source:[14,6,292,40], middle:[45,73,230,60], target:[14,159,292,40], wire:'M160 46V73 M160 133V159' }
            : { view:'0 0 890 192', source:[22,63,172,62], middle:[326,41,235,106], target:[697,63,172,62], wire:'M194 94H245L286 69H326 M194 94H326 M194 94H245L286 119H326 M561 69H605L651 94H697 M561 94H697 M561 119H605L651 94' };
        const node = ([x,y,w,h], title, hint) => `<rect class="flow-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/><text x="${x+w/2}" y="${y+h/2-3}" text-anchor="middle">${title}</text><text class="small" x="${x+w/2}" y="${y+h/2+12}" text-anchor="middle">${hint}</text>`;
        const [x,y,w,h]=layout.middle;
        return `<svg class="diagram-${mobile?'mobile':'desktop'}" viewBox="${layout.view}" role="img" aria-label="Luau source flows through the protection layers to a protected runtime">
        <defs><pattern id="grid-${mobile}" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" fill="none" stroke="#242e40" opacity=".6"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#grid-${mobile})"/><path class="flow-wire" d="${layout.wire}"/><path class="flow-wire flow-pulse" d="${layout.wire}"/>
        ${node(layout.source,'SOURCE','Lua / Luau program')}
        <rect x="${x+8}" y="${y-5}" width="${w-16}" height="${h+10}" rx="8" fill="#172337" stroke="#3f587b"/>
        ${node(layout.middle,'PROTECTION LAYERS','Script protection')}
        ${node(layout.target,'PROTECTED RUNTIME','Protected output')}</svg>`;
    }
    const mount = outlet => {
        const page = document.createElement('div');
        page.className = 'web-landing';
        // Static product copy. Account entry retains the existing workspace/auth flow.
        const public23 = window.LuavexRelease.version === window.LuavexRelease.upcomingVersion;
        page.innerHTML = `
${planetMarkup}
<a class="web-skip" href="#webOverview">Skip to overview</a>
<header class="web-nav web-wrap">
<a class="web-brand" href="/#/" data-route aria-label="Luavex home"><img src="/assets/luavex-icon-blue.png" width="44" height="44" alt=""><span class="brand-wordmark-crop" aria-hidden="true"><img src="/assets/luavex-brand.png" alt=""></span><span class="sr-only">Luavex</span></a>
<nav aria-label="Product navigation"><a href="#webArchitecture">Architecture</a><a href="#webWorkflow">Workflow</a><a href="/releases.html">Releases</a></nav>
<a class="web-nav-entry" href="/#/workspace" data-route>Open workspace <span aria-hidden="true">↗</span></a>
</header>
<aside class="web-release-banner web-wrap" aria-label="Release announcement"><span>${public23 ? 'New' : 'Upcoming'}</span><strong>Luavex ${window.LuavexRelease.upcomingVersion} ${public23 ? 'is here' : 'is in development'}</strong><a href="/releases.html">What’s new ↗</a><button type="button" data-dismiss-release aria-label="Dismiss announcement">×</button></aside>
<section class="web-hero web-wrap" aria-labelledby="webTitle">
<div class="web-hero-copy"><span class="web-eyebrow"><i></i> ${window.LuavexRelease.name} · Current release</span><h1 id="webTitle">Build in the clear.<br><span>Ship protected.</span></h1><p>Protect your Lua and Luau scripts in one workspace.</p><div class="web-actions"><a class="web-primary" href="/#/workspace" data-route>Open workspace <span aria-hidden="true">↗</span></a><a class="web-secondary" href="#webShowcase">Explore the product <span aria-hidden="true">↓</span></a></div><p class="web-release-note">${window.LuavexRelease.name} <span>Runtime Integrity &amp; Authorization</span></p></div>
<div class="web-orbit-label" aria-hidden="true"><span>LUAVEX / ORBITAL SERIES</span><i></i><span>LUA · LUAU</span></div>
</section>
<section class="web-showcase web-wrap" id="webShowcase" aria-labelledby="webShowcaseTitle">
<h2 id="webShowcaseTitle" class="sr-only">Explore Luavex</h2>
<div class="showcase-frame" role="region" aria-roledescription="carousel" aria-label="Luavex product tour" tabindex="0">
  <div class="showcase-top"><span><i></i> LUAVEX / PRODUCT TOUR</span><span class="showcase-counter" aria-live="polite">01 / 03</span></div>
  <div class="showcase-stage">
    <article class="showcase-slide" aria-label="1 of 3: Obfuscation Workspace">
      <div class="tour-toolbar"><span>◈ orbit.luau</span><span>Sample build</span><a class="web-primary" href="/#/workspace" data-route>Open Workspace ↗</a></div>
      <div class="showcase-editors">
        <div class="showcase-pane"><div>Source <small>Lua / Luau</small></div><pre><code><b>local</b> function greet(name)
    return "Hello, " .. name
end

print(greet("Luavex"))</code></pre></div>
        <span class="showcase-action" aria-hidden="true">▷ <span>Obfuscate</span></span>
        <div class="showcase-pane"><div>Output <small>Sample output</small></div><pre><code>-- Protected output
<b>local</b> _a = { 73, 91, 26 }
<b>local</b> _b = { 0, 2, 1 }
<span class="showcase-code-muted">-- Protected script sample</span></code></pre></div>
      </div>
    </article>
    <article class="showcase-slide" aria-label="2 of 3: Protection Architecture" hidden>
      <header><span>02 / ARCHITECTURE</span><h3>Protection Architecture</h3><p>A simplified view of how a build changes source representation.</p></header>
      <div class="tour-diagram">${diagram(false)}${diagram(true)}</div>
    </article>
    <article class="showcase-slide" aria-label="3 of 3: My Storage Preview" hidden>
      <header><span>03 / ${public23 ? 'SCRIPT LIBRARY' : 'COMING IN ' + window.LuavexRelease.upcomingVersion}</span><h3>My Storage${public23 ? '' : ' <small>Preview</small>'}</h3><p>Keep your scripts in one place.</p></header>
      <div class="showcase-storage tour-storage"><aside><span>Script library</span><strong>Script details</strong></aside><dl><div><dt>Script name</dt><dd>Required when saving</dd></div><div><dt>Source</dt><dd>Original Lua or Luau</dd></div><div><dt>Protected output</dt><dd>Protected build</dd></div></dl></div>
    </article>
  </div>
  <div class="showcase-controls"><button type="button" data-showcase-step="-1" aria-label="Previous slide">←</button><div class="showcase-dots" role="group" aria-label="Choose a slide"><button type="button" data-showcase-slide="0" aria-label="Obfuscation Workspace" aria-pressed="true">01</button><button type="button" data-showcase-slide="1" aria-label="Protection Architecture" aria-pressed="false">02</button><button type="button" data-showcase-slide="2" aria-label="My Storage Preview" aria-pressed="false">03</button></div><button type="button" data-showcase-step="1" aria-label="Next slide">→</button></div>
</div>
</section>
<section class="web-wrap web-v3-note" id="webOverview"><div id="webArchitecture"><h2>Protect your code.</h2><p>Values can still be observed at runtime. Test protected builds in your target environment.</p></div><div id="webWorkflow"><h2>From source to output.</h2><p>Open a script, build it, then download the result.</p></div><div id="webPreview"><h2>${window.LuavexRelease.name}</h2><a href="/releases.html">Read release notes ↗</a></div></section>
<footer class="web-footer web-wrap"><div><strong>LUAVEX</strong><p>Lua &amp; Luau script protection.</p></div><nav aria-label="Public footer"><a href="/#/workspace" data-route>Workspace</a><a href="#webWorkflow">Getting started</a><a href="/releases.html">Release history</a></nav><small>${window.LuavexRelease.name} · Lua &amp; Luau</small></footer>`;
        outlet.replaceChildren(page);
        // Keep section navigation inside the landing route, including keyboard activation.
        const navigateSection = event => {
            const link = event.target.closest('a[href^="#web"]');
            if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
            const target = page.querySelector(link.getAttribute('href'));
            if (!target) return;
            event.preventDefault();
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
        };
        page.addEventListener('click', navigateSection);
        const banner = page.querySelectorAll?.('.web-release-banner')[0];
        if (banner) {
            const key = 'luavex-release-' + window.LuavexRelease.upcomingVersion + (public23 ? '-published' : '-upcoming');
            try { banner.hidden = sessionStorage.getItem(key) === '1'; } catch {}
            banner.querySelector('button').addEventListener('click', () => {
                banner.hidden = true;
                try { sessionStorage.setItem(key, '1'); } catch {}
                page.querySelector('.web-hero .web-primary')?.focus();
            });
        }
        const frame = page.querySelectorAll?.('.showcase-frame')[0];
        if (frame) {
            const slides = [...frame.querySelectorAll('.showcase-slide')];
            const indicators = [...frame.querySelectorAll('[data-showcase-slide]')];
            const counter = frame.querySelector('.showcase-counter');
            let active = 0;
            let touchStart;
            const select = index => {
                const previous = active;
                active = (index + slides.length) % slides.length;
                if (previous === active) return;
                slides.forEach((slide, i) => { slide.hidden = i !== active; });
                indicators.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
                counter.textContent = '0' + (active + 1) + ' / 03';
                if (!document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.body.classList.contains('animations-off')) {
                    const layer = slides[active].lastElementChild;
                    layer?.animate?.([{ transform: 'translateX(10px)', opacity: .75 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 230, easing: 'ease-out' });
                }
            };
            frame.addEventListener('click', event => {
                const step = event.target.closest('[data-showcase-step]');
                const indicator = event.target.closest('[data-showcase-slide]');
                if (step) select(active + Number(step.dataset.showcaseStep));
                if (indicator) select(Number(indicator.dataset.showcaseSlide));
            });
            frame.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
                event.preventDefault();
                if (event.key === 'Home') select(0);
                else if (event.key === 'End') select(slides.length - 1);
                else select(active + (event.key === 'ArrowLeft' ? -1 : 1));
            });
            frame.addEventListener('touchstart', event => {
                touchStart = event.touches.length === 1 ? event.touches[0] : null;
            }, { passive: true });
            frame.addEventListener('touchcancel', () => { touchStart = null; });
            frame.addEventListener('touchend', event => {
                if (!touchStart) return;
                const touch = event.changedTouches[0];
                const dx = touch.clientX - touchStart.clientX;
                const dy = touch.clientY - touchStart.clientY;
                touchStart = null;
                if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) select(active + (dx < 0 ? 1 : -1));
            }, { passive: true });
        }
        return () => page.removeEventListener('click', navigateSection);
    };
    window.SukaRedLanding = { mount, planetMarkup };
})();
