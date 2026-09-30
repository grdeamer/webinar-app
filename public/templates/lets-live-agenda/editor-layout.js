(function () {
  const blocks = window.POA_CONFIG?.EDITOR_LAYOUT;
  if (!Array.isArray(blocks)) return;
  const hero = document.querySelector('.hero-copy');
  const sidebar = document.querySelector('.status-panel');
  const agenda = document.querySelector('.agenda-section');
  const footer = document.querySelector('.site-footer');
  if (!hero || !sidebar || !agenda || !footer) return;

  const selectors = {
    eyebrow: '.hero-copy > .eyebrow', title: '#eventTitle', description: '#eventDescription',
    current: '#liveSummary', status: '.status-panel-top', clock: '.clock-block',
    countdown: '#countdownCard', notice: '.status-note', 'agenda-date': '#eventDayDate',
    'agenda-title': '#agendaHeading', agenda: '#agendaList', footer: '.site-footer .footer-brand',
    attribution: '.site-footer .footer-credit'
  };
  const sources = Object.fromEntries(Object.entries(selectors).map(([role, selector]) => [role, document.querySelector(selector)]));
  // Retain the original nodes and IDs for the live runtime. Visible copies forward interactions.
  const parking = document.createElement('div');
  parking.hidden = true;
  parking.style.display = 'none';
  parking.setAttribute('aria-hidden', 'true');
  document.body.append(parking);
  Object.values(sources).forEach(node => { if (node) parking.append(node); });
  const join = document.createElement('a');
  join.id = 'enterButton'; join.className = 'enter-button'; join.href = '#';
  const joinText = document.createElement('span');
  joinText.id = 'enterButtonText'; joinText.textContent = 'Enter live meeting';
  join.append(joinText); parking.append(join); sources.join = join;
  const next = document.createElement('div');
  next.className = 'editor-next-session';
  parking.append(next); sources.next = next;
  const actions = document.createElement('div');
  actions.className = 'hero-actions'; hero.append(actions);
  const agendaLayout = document.createElement('div');
  const heading = agenda.querySelector('.section-heading');
  if (heading) { heading.hidden = true; heading.style.display = 'none'; }
  agenda.append(agendaLayout);
  const regions = { welcome: hero, actions, sidebar, agenda: agendaLayout, footer };
  const entries = blocks.filter(block => block.props?.visible !== false).map((block, index) => {
    const container = document.createElement('div');
    container.className = 'editor-layout-item';
    container.dataset.editorBlock = block.id;
    const region = regions[block.props.layoutRegion] || hero;
    if (region === hero) hero.insertBefore(container, actions);
    else region.append(container);
    container.addEventListener('click', event => {
      const source = sources[block.props.layoutRole];
      const target = event.target.closest('[data-editor-action]');
      if (!source || !target || event.target.closest('a')) return;
      const original = [source, ...source.querySelectorAll('*')][Number(target.dataset.editorAction)];
      if (original && original.matches('button')) { event.preventDefault(); original.click(); }
    });
    container.addEventListener('change', event => {
      const source = sources[block.props.layoutRole];
      if (!source || !event.target.matches('select')) return;
      const original = [source, ...source.querySelectorAll('*')][Number(event.target.dataset.editorAction)];
      if (original) { original.value = event.target.value; original.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    return { block, container, index, signature: '' };
  });
  function safeLink(value) { return /^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(value) ? value : '#'; }
  function refresh(state) {
    if (state?.next_session) next.textContent = state.next_session.title || state.next_session.name || 'Next session';
    else if (state) next.textContent = 'No next session';
    if (state) next.hidden = !state.next_session;
    entries.forEach(entry => {
      const props = entry.block.props;
      entry.container.hidden = props.layoutRole === "agenda" && state?.attendee_component_state?.agenda === false;
      const role = props.layoutRole;
      const source = sources[role];
      const signature = source?.outerHTML || '';
      if (entry.signature === signature && entry.container.childNodes.length) return;
      entry.signature = signature;
      const copy = source ? source.cloneNode(true) : document.createElement('p');
      const nodes = [copy, ...copy.querySelectorAll('*')];
      nodes.forEach((node, index) => {
        node.dataset.editorAction = index;
        if (node.id) node.id = `editor-${entry.index}-${node.id}`;
        if (node.hasAttribute('for')) node.setAttribute('for', `editor-${entry.index}-${node.getAttribute('for')}`);
      });
      if (entry.block.type === 'rich_text' && !props.bindEventTitle && !props.bindEventDescription) {
        const textTarget = role === 'notice' ? copy.querySelector('span') : copy;
        if (textTarget) textTarget.textContent = props.body || '';
        copy.hidden = false;
      }
      if (props.title) {
        if (role === 'next' || role === 'agenda-date' || role === 'agenda') { const label = document.createElement('strong'); label.textContent = props.title; copy.prepend(label, document.createTextNode(' ')); }
        const labelSelector = { current: '#liveLabel', join: '#enterButtonText', clock: '.clock-label', countdown: '.countdown-label', status: '.status-pill' }[role];
        const label = labelSelector?.startsWith('#') ? copy.querySelector(`#editor-${entry.index}-${labelSelector.slice(1)}`) : labelSelector ? copy.querySelector(labelSelector) : null;
        if (label) label.textContent = props.title;
      }
      if (props.href) {
        let link = copy.matches('a') ? copy : copy.querySelector('a');
        if (!link && role === 'attribution') { link = document.createElement('a'); link.textContent = copy.textContent; copy.replaceChildren(link); }
        if (link) link.href = safeLink(String(props.href));
      }
      // Keep the selected timezone when cloning a select with a changed value.
      if (source) copy.querySelectorAll('select').forEach((select, index) => { select.value = source.querySelectorAll('select')[index]?.value || select.value; });
      entry.container.replaceChildren(copy);
    });
  }
  window.POA_EDITOR_LAYOUT = { refresh };
  refresh();
})();
