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
    const mount = outlet => {
        const page = document.createElement('div');
        page.className = 'web-landing';
        // Static product copy. Account entry retains the existing workspace/auth flow.
        page.innerHTML = `
${planetMarkup}
<a class="web-skip" href="#webOverview">Skip to overview</a>
<header class="web-nav web-wrap">
<a class="web-brand" href="/#/" data-route aria-label="Luavex home"><img src="/assets/luavex-icon-blue.png" width="44" height="44" alt=""><span class="brand-wordmark-crop" aria-hidden="true"><img src="/assets/luavex-brand.png" alt=""></span><span class="sr-only">Luavex</span></a>
<nav aria-label="Product navigation"><a href="#webArchitecture">Architecture</a><a href="#webWorkflow">Workflow</a><a href="/releases.html">Releases</a></nav>
<a class="web-nav-entry" href="/#/workspace" data-route>Open workspace <span aria-hidden="true">↗</span></a>
</header>
<section class="web-hero web-wrap" aria-labelledby="webTitle">
<div class="web-hero-copy"><span class="web-eyebrow"><i></i> ${window.LuavexRelease.name} · Current release</span><h1 id="webTitle">Your code.<br>Your work.<br><span>Harder to unravel.</span></h1><p>Protect your Lua and Luau scripts without handing over readable source.</p><div class="web-actions"><a class="web-primary" href="/#/workspace" data-route>Open workspace <span aria-hidden="true">↗</span></a><a class="web-secondary" href="#webPreview">Explore 2.1 <span aria-hidden="true">↓</span></a></div><p class="web-release-note">${window.LuavexRelease.name} <span>Runtime Execution Diversity</span></p></div>
<figure class="web-architecture-visual" aria-labelledby="webVisualCaption"><div class="web-visual-heading"><span>Luavex / Protected execution</span><span>02.1</span></div><div class="web-layer web-layer-one"><span>Source</span><b>Logic &amp; data</b><div class="web-line-pattern"></div></div><div class="web-layer web-layer-two"><span>Build</span><b>Structure varies by build</b><div class="web-node-pattern"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="web-layer web-layer-three"><span>Runtime</span><b>Verified before execution</b><div class="web-visual-bars"><i></i><i></i><i></i><i></i><i></i></div></div><figcaption id="webVisualCaption">From source to protected execution.<small>A simplified view of how Luavex protects a script.</small></figcaption></figure>
</section>
<div class="web-trust web-wrap" aria-label="Product focus"><span>Lua &amp; Luau</span><span>Build-specific output</span><span>Runtime-aware protection</span><span>Browser-based workflow</span></div>
<section class="web-section web-wrap" id="webOverview" tabindex="-1" aria-labelledby="webProtectTitle"><div class="web-section-heading"><span class="web-eyebrow">What Luavex protects</span><h2 id="webProtectTitle">Same script.<br>Less to read from the source.</h2><p>Luavex changes how your code and data are represented, not what your script is meant to do. Values can still be observed at runtime; the aim is to make analysis harder.</p></div><div class="web-feature-row"><article><span>01 / Logic</span><h3>Script logic</h3><p>Your logic runs through a generated virtual machine instead of readable source.</p></article><article><span>02 / Data</span><h3>Protected constants</h3><p>Strings and other values stay encoded until they are needed.</p></article><article><span>03 / Runtime</span><h3>Runtime checks</h3><p>Checks during execution help reject altered or mismatched output.</p></article></div></section>
<section class="web-section web-wrap web-architecture" id="webArchitecture" aria-labelledby="webArchitectureTitle"><div><span class="web-eyebrow">Inside ${window.LuavexRelease.version}</span><h2 id="webArchitectureTitle">Different builds.<br>Fewer shortcuts for analysis.</h2><p>2.1 broadens how protected builds organize and execute script logic, reducing structural repetition across builds.</p><a class="web-text-link" href="#webPreview">See the current release ↗</a></div><ol class="web-architecture-list"><li><span>01</span><div><h3>Layered loading</h3><p>Loading and execution work in stages rather than one combined step.</p></div></li><li><span>02</span><div><h3>Separate execution state</h3><p>Each call keeps its own state, including recursive calls and callbacks.</p></div></li><li><span>03</span><div><h3>Build-specific execution</h3><p>Different builds make the same analysis less reusable.</p></div></li></ol></section>
<section class="web-section web-wrap web-balance" aria-labelledby="webBalanceTitle"><div><span class="web-eyebrow">Performance & compatibility</span><h2 id="webBalanceTitle">Test it where<br>your script runs.</h2></div><div><h3>Runtime cost matters</h3><p>Protection adds work. Performance and compatibility remain part of every release.</p><h3>Check the whole script</h3><p>Run the protected output in the environment you use. Test callbacks, dependencies and longer sessions, not just the first few lines.</p></div></section>
<section class="web-section web-wrap" id="webWorkflow" aria-labelledby="webWorkflowTitle"><div class="web-section-heading"><span class="web-eyebrow">In the workspace</span><h2 id="webWorkflowTitle">From source to protected output.</h2></div><ol class="web-workflow"><li><span>01</span><h3>Paste your source</h3><p>Sign in with Discord, then paste or open your Lua or Luau file.</p></li><li><span>02</span><h3>Create a build</h3><p>Run the build and review its status in the workspace.</p></li><li><span>03</span><h3>Download &amp; test</h3><p>Save the protected file and check it in your target environment.</p></li></ol></section>
<section class="web-section web-wrap web-preview" id="webPreview" aria-labelledby="webPreviewTitle"><div><span class="web-eyebrow">Current release</span><h2 id="webPreviewTitle">${window.LuavexRelease.name}</h2><p class="web-preview-subtitle">Runtime Execution Diversity</p><p>More build-specific runtime variation, with continued work on compatibility and stability.</p></div><ul><li>Broader execution-layout diversity</li><li>More varied handling of protected data</li><li>Less structural repetition across builds</li><li>Runtime stability and compatibility fixes</li></ul></section>
<section class="web-section web-wrap web-release" aria-labelledby="webReleaseTitle"><div><span class="web-eyebrow">Previous release</span><h2 id="webReleaseTitle">Luavex 2.0</h2><p>2.0 introduced a redesigned runtime with layered loading and separate execution state.</p></div><a class="web-secondary" href="/releases.html">Read release history ↗</a></section>
<section class="web-final web-wrap" aria-labelledby="webFinalTitle"><span class="web-eyebrow">${window.LuavexRelease.name} · Current release</span><h2 id="webFinalTitle">Start with a script you know.</h2><p>Create a protected build, then test it alongside your original.</p><a class="web-primary" href="/#/workspace" data-route>Open workspace ↗</a></section>
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
        return () => page.removeEventListener('click', navigateSection);
    };
    window.SukaRedLanding = { mount, planetMarkup };
})();
