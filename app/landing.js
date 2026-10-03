(function () {
    'use strict';
    const mount = outlet => {
        const page = document.createElement('div');
        page.className = 'web-landing';
        // Static product copy. Account entry retains the existing workspace/auth flow.
        page.innerHTML = `
<a class="web-skip" href="#webOverview">Skip to overview</a>
<header class="web-nav web-wrap">
<a class="web-brand" href="/#/" data-route aria-label="Luavex home"><img src="/assets/luavex-icon-blue.png" width="44" height="44" alt=""><span class="brand-wordmark-crop" aria-hidden="true"><img src="/assets/luavex-brand.png" alt=""></span><span class="sr-only">Luavex</span></a>
<nav aria-label="Product navigation"><a href="#webArchitecture">Architecture</a><a href="#webWorkflow">Workflow</a><a href="/releases.html">Releases</a></nav>
<a class="web-nav-entry" href="/#/workspace" data-route>Open workspace <span aria-hidden="true">↗</span></a>
</header>
<section class="web-hero web-wrap" aria-labelledby="webTitle">
<div class="web-hero-copy"><span class="web-eyebrow"><i></i> ${window.LuavexRelease.name} · Current release</span><h1 id="webTitle">Your code.<br>Your work.<br><span>Harder to unravel.</span></h1><p>Protect your Lua and Luau scripts without handing over readable source.</p><div class="web-actions"><a class="web-primary" href="/#/workspace" data-route>Open workspace <span aria-hidden="true">↗</span></a><a class="web-secondary" href="#webPreview">Explore 2.0 <span aria-hidden="true">↓</span></a></div><p class="web-release-note">${window.LuavexRelease.name} <span>VM Architecture Redesign</span></p></div>
<figure class="web-architecture-visual" aria-labelledby="webVisualCaption"><div class="web-visual-heading"><span>Luavex / Protected execution</span><span>02.0</span></div><div class="web-layer web-layer-one"><span>Source</span><b>Logic &amp; data</b><div class="web-line-pattern"></div></div><div class="web-layer web-layer-two"><span>Build</span><b>Structure varies by build</b><div class="web-node-pattern"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="web-layer web-layer-three"><span>Runtime</span><b>Verified before execution</b><div class="web-visual-bars"><i></i><i></i><i></i><i></i><i></i></div></div><figcaption id="webVisualCaption">From source to protected execution.<small>A simplified view of how Luavex protects a script.</small></figcaption></figure>
</section>
<div class="web-trust web-wrap" aria-label="Product focus"><span>Lua &amp; Luau</span><span>Build-specific output</span><span>Runtime-aware protection</span><span>Browser-based workflow</span></div>
<section class="web-section web-wrap" id="webOverview" tabindex="-1" aria-labelledby="webProtectTitle"><div class="web-section-heading"><span class="web-eyebrow">What Luavex protects</span><h2 id="webProtectTitle">Same script.<br>Less to read from the source.</h2><p>Luavex changes how your code and data are represented, not what your script is meant to do. Values can still be observed at runtime; the aim is to make analysis harder.</p></div><div class="web-feature-row"><article><span>01 / Logic</span><h3>Script logic</h3><p>Your logic runs through a generated virtual machine instead of readable source.</p></article><article><span>02 / Data</span><h3>Protected constants</h3><p>Strings and other values stay encoded until they are needed.</p></article><article><span>03 / Runtime</span><h3>Runtime checks</h3><p>Checks during execution help reject altered or mismatched output.</p></article></div></section>
<section class="web-section web-wrap web-architecture" id="webArchitecture" aria-labelledby="webArchitectureTitle"><div><span class="web-eyebrow">Inside ${window.LuavexRelease.version}</span><h2 id="webArchitectureTitle">Different builds.<br>Fewer shortcuts for analysis.</h2><p>2.0 reworks how protected scripts load and run. Builds differ in structure, and each call keeps its state separate.</p><a class="web-text-link" href="#webPreview">See the current release ↗</a></div><ol class="web-architecture-list"><li><span>01</span><div><h3>Layered loading</h3><p>Loading and execution work in stages rather than one combined step.</p></div></li><li><span>02</span><div><h3>Separate execution state</h3><p>Each call keeps its own state, including recursive calls and callbacks.</p></div></li><li><span>03</span><div><h3>Build-specific execution</h3><p>Different builds make the same analysis less reusable.</p></div></li></ol></section>
<section class="web-section web-wrap web-balance" aria-labelledby="webBalanceTitle"><div><span class="web-eyebrow">Performance & compatibility</span><h2 id="webBalanceTitle">Test it where<br>your script runs.</h2></div><div><h3>Runtime cost matters</h3><p>Protection adds work. Performance and compatibility remain part of every release.</p><h3>Check the whole script</h3><p>Run the protected output in the environment you use. Test callbacks, dependencies and longer sessions, not just the first few lines.</p></div></section>
<section class="web-section web-wrap" id="webWorkflow" aria-labelledby="webWorkflowTitle"><div class="web-section-heading"><span class="web-eyebrow">In the workspace</span><h2 id="webWorkflowTitle">From source to protected output.</h2></div><ol class="web-workflow"><li><span>01</span><h3>Paste your source</h3><p>Sign in with Discord, then paste or open your Lua or Luau file.</p></li><li><span>02</span><h3>Create a build</h3><p>Run the build and review its status in the workspace.</p></li><li><span>03</span><h3>Download &amp; test</h3><p>Save the protected file and check it in your target environment.</p></li></ol></section>
<section class="web-section web-wrap web-preview" id="webPreview" aria-labelledby="webPreviewTitle"><div><span class="web-eyebrow">Current release</span><h2 id="webPreviewTitle">${window.LuavexRelease.name}</h2><p class="web-preview-subtitle">VM Architecture Redesign</p><p>A redesigned foundation for protected scripts, with more variation between builds and better separation of execution state.</p></div><ul><li>Layered loading and protected execution</li><li>More variation in how builds execute</li><li>Tighter isolation between calls</li><li>Runtime and compatibility improvements</li></ul></section>
<section class="web-section web-wrap web-release" aria-labelledby="webReleaseTitle"><div><span class="web-eyebrow">Previous release</span><h2 id="webReleaseTitle">Luavex 1.9</h2><p>1.9 introduced Deep Constant Protection, strengthening how script data is represented and used.</p></div><a class="web-secondary" href="/releases.html">Read release history ↗</a></section>
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
    window.SukaRedLanding = { mount };
})();
