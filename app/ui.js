(function () {
    'use strict';

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    };

    const toggle = (label, checked, onChange, options = {}) => {
        const row = el('label', 'toggle-row');
        const input = document.createElement('input'); input.type = 'checkbox'; input.checked = checked; input.disabled = options.disabled === true;
        input.addEventListener('change', () => onChange(input.checked));
        row.append(el('span', '', label), input, el('span', 'toggle-visual'));
        if (options.disabled) row.classList.add('is-disabled');
        if (options.note) row.title = options.note;
        return row;
    };

    const customSelect = (value, choices, onChange, ariaLabel) => {
        let selected = String(value);
        const root = el('div', 'custom-select');
        const trigger = el('button', 'custom-select-trigger'); trigger.type = 'button';
        trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-label', ariaLabel || 'Select option');
        const label = el('span'); const arrow = el('span', 'select-arrow'); arrow.append(window.SukaRedIcons.icon('chevron', { size: 14 }));
        trigger.append(label, arrow);
        const menu = el('div', 'custom-select-menu'); menu.setAttribute('role', 'listbox'); menu.hidden = true;
        const refresh = () => {
            const current = choices.find(choice => String(choice.value) === selected) || choices[0];
            label.textContent = current?.label || '';
            [...menu.children].forEach(button => button.setAttribute('aria-selected', String(button.dataset.value === selected)));
        };
        const close = () => { menu.hidden = true; root.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); };
        const open = () => { menu.hidden = false; root.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); };
        choices.forEach(choice => {
            const option = el('button', 'custom-select-option', choice.label); option.type = 'button'; option.dataset.value = String(choice.value); option.setAttribute('role', 'option');
            option.addEventListener('click', () => {
                selected = option.dataset.value; refresh(); close();
                const parsed = Number.isNaN(Number(selected)) || selected === '' ? selected : Number(selected);
                onChange(parsed);
            });
            menu.append(option);
        });
        trigger.addEventListener('click', () => menu.hidden ? open() : close());
        trigger.addEventListener('keydown', event => {
            if (['ArrowDown', 'Enter', ' '].includes(event.key) && menu.hidden) { event.preventDefault(); open(); menu.querySelector('[aria-selected="true"]')?.focus(); }
            if (event.key === 'Escape') close();
        });
        root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) close(); });
        root.append(trigger, menu); refresh();
        return { element: root, get value() { return selected; }, set value(next) { selected = String(next); refresh(); } };
    };

    const selectField = (label, value, choices, onChange) => {
        const row = el('label', 'field-row'); row.append(el('span', '', label), customSelect(value, choices, onChange, label).element); return row;
    };

    const toast = (message, type = 'info') => {
        const region = document.getElementById('toastRegion');
        const item = el('div', `toast toast-${type}`); item.setAttribute('role', type === 'error' ? 'alert' : 'status'); item.append(el('span', '', message));
        const close = el('button', 'toast-close'); close.type = 'button'; close.setAttribute('aria-label', 'Dismiss notification'); close.append(window.SukaRedIcons.icon('close', { size: 14 })); close.addEventListener('click', () => item.remove());
        item.append(close); region.append(item);
        setTimeout(() => item.classList.add('is-visible'), 10);
        setTimeout(() => { item.classList.remove('is-visible'); setTimeout(() => item.remove(), 180); }, 4200);
    };

    let activeModal = null;
    let modalTrigger = null;
    const closeModal = () => {
        if (!activeModal) return;
        const overlay = activeModal; activeModal = null;
        overlay.classList.remove('is-open'); document.body.classList.remove('modal-open');
        setTimeout(() => overlay.remove(), 180);
        const restore = modalTrigger; modalTrigger = null; restore?.focus?.({ preventScroll: true });
    };

    const openModal = ({ title, subtitle, content, actions = [], trigger = document.activeElement }) => {
        closeModal();
        modalTrigger = trigger instanceof HTMLElement ? trigger : null;
        const overlay = el('div', 'modal-overlay');
        const dialog = el('section', 'settings-modal'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.tabIndex = -1;
        const header = el('header', 'modal-header'); const copy = el('div'); const heading = el('h2', '', title); heading.id = `modal-${Date.now()}`; dialog.setAttribute('aria-labelledby', heading.id); copy.append(heading); if (subtitle) copy.append(el('p', '', subtitle));
        const close = el('button', 'icon-button modal-close'); close.type = 'button'; close.setAttribute('aria-label', 'Close settings'); close.append(window.SukaRedIcons.icon('close')); close.addEventListener('click', closeModal); header.append(copy, close);
        const body = el('div', 'modal-body'); body.append(content);
        const footer = el('footer', 'modal-actions');
        actions.forEach(action => { const button = el('button', `${action.primary ? 'button button-primary' : 'button'}${action.className ? ` ${action.className}` : ''}`, action.label); button.type = 'button'; button.addEventListener('click', action.onClick); footer.append(button); });
        dialog.append(header, body, footer); overlay.append(dialog);
        overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); });
        const keyHandler = event => {
            if (!activeModal) { document.removeEventListener('keydown', keyHandler); return; }
            if (event.key === 'Escape') closeModal();
            if (event.key === 'Tab') {
                const focusable = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')];
                if (!focusable.length) return;
                const first = focusable[0]; const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', keyHandler);
        document.getElementById('modalRoot').append(overlay); activeModal = overlay; document.body.classList.add('modal-open');
        requestAnimationFrame(() => { overlay.classList.add('is-open'); dialog.focus(); });
        return { overlay, dialog, body };
    };

    const confirm = (title, message) => new Promise(resolve => {
        openModal({ title, content: el('p', 'confirm-copy', message), actions: [
            { label: 'Cancel', onClick: () => { closeModal(); resolve(false); } },
            { label: 'Confirm', primary: true, onClick: () => { closeModal(); resolve(true); } }
        ] });
    });

    const settingsContent = (initial, onDraft) => {
        let draft = { ...initial };
        const root = el('div', 'settings-content');
        const update = changes => { draft = { ...draft, ...changes }; onDraft(draft); render(); };
        const updateFeature = (name, value) => {
            const protectionFeatures = { ...draft.protectionFeatures, [name]: value };
            if (name === 'virtualMachine' && !value) protectionFeatures.vmMutation = false;
            update({ protectionFeatures });
        };
        const render = () => {
            root.replaceChildren();
            const featureSection = el('section', 'settings-section protection-feature-section');
            featureSection.append(el('h3', '', 'Protection'));
            const featureToggles = el('div', 'toggle-grid');
            const features = draft.protectionFeatures;
            featureToggles.append(
                toggle('Virtualization', features.virtualMachine, value => updateFeature('virtualMachine', value)),
                toggle('VM Protection', features.vmMutation, value => updateFeature('vmMutation', value), {
                    disabled: !features.virtualMachine,
                    note: 'VM Protection requires Virtualization.'
                }),
                toggle('String Protection', features.stringProtection, value => updateFeature('stringProtection', value)),
                toggle('Constant Protection', features.constantProtection, value => updateFeature('constantProtection', value)),
                toggle('Integrity Protection', features.runtimeIntegrity, value => updateFeature('runtimeIntegrity', value)),
                toggle('Minify Output', features.minifyOutput, value => updateFeature('minifyOutput', value))
            );
            featureSection.append(featureToggles);
            if (!features.virtualMachine) featureSection.append(el('p', 'section-note dependency-note', 'VM Protection requires Virtualization.'));
            root.append(featureSection);
            const editorSection = el('section', 'settings-section'); editorSection.append(el('h3', '', 'Workspace'));
            const toggles = el('div', 'toggle-grid');
            toggles.append(toggle('Word Wrap', draft.wordWrap, value => update({ wordWrap: value })), toggle('Minimap', draft.minimap, value => update({ minimap: value })), toggle('Motion', draft.animations, value => update({ animations: value })));
            if (window.LuavexAuth.state.localDevelopment) toggles.append(toggle('Developer Mode', draft.developerMode, value => update({ developerMode: value })));
            editorSection.append(toggles);
            const historySection = el('section', 'settings-section');
            historySection.append(el('h3', '', 'Account History'), el('p', 'section-note', 'Only build metadata is retained. Source code and protected output are never stored.'));
            root.append(editorSection, historySection);
        };
        render();
        return root;
    };

    const openSettingsModal = trigger => {
        let draft = window.SukaRedSettings.load();
        openModal({
            title: 'Settings', subtitle: 'Workspace preferences.', trigger,
            content: settingsContent(draft, value => { draft = value; }),
            actions: [
                { label: 'Cancel', className: 'button-cancel', onClick: closeModal },
                { label: 'Save Settings', className: 'button-save', primary: true, onClick: () => { window.SukaRedSettings.save(draft); document.body.classList.toggle('animations-off', !draft.animations); closeModal(); toast('Settings saved', 'success'); } }
            ]
        });
    };

    window.SukaRedUI = { el, toggle, customSelect, selectField, toast, openModal, closeModal, confirm, settingsContent, openSettingsModal };
})();
