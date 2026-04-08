/* ═══════════════════════════════════════════════════════════════════
   Datalog Visualizer — Shared Engine (datalog-shared.js)
   All three widgets import this file.
═══════════════════════════════════════════════════════════════════ */
'use strict';

/* ── DOM utilities ─────────────────────────────────────────────── */
const dvEl  = id => document.getElementById(id);
const dvEsc = s  => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const dvShowErr = (id, msg) => { const e = dvEl(id); if(!e) return; e.textContent = '⚠ ' + msg; e.classList.add('visible'); };
const dvHideErr = id => { const e = dvEl(id); if(e) e.classList.remove('visible'); };

/* ── Render helpers ────────────────────────────────────────────── */
function dvRenderRelations(container, relations, newTuples = {}, queryRel = null) {
  container.innerHTML = '';
  const names = Object.keys(relations);
  if (!names.length) { container.innerHTML = '<span class="dv-empty">∅</span>'; return; }
  names.forEach(name => {
    const newList = newTuples[name] || [];
    const block = document.createElement('div');
    block.className = 'dv-relation';
    const header = document.createElement('div');
    header.className = 'dv-relation-name';
    header.innerHTML = dvEsc(name);
    const pill = document.createElement('span');
    pill.className = 'dv-delta-pill' + (newList.length ? '' : ' zero');
    pill.textContent = '+' + newList.length;
    header.appendChild(pill);
    block.appendChild(header);
    const tuples = document.createElement('div');
    tuples.className = 'dv-relation-tuples';
    const items = relations[name] || [];
    if (!items.length) tuples.innerHTML = '<span class="dv-empty">∅</span>';
    else items.forEach(t => {
      const span = document.createElement('span');
      const isNew  = newList.includes(t);
      const isHl   = queryRel && name === queryRel && !isNew;
      span.className = 'dv-tuple' + (isNew ? ' dv-new' : isHl ? ' dv-highlight' : '');
      span.textContent = t;
      tuples.appendChild(span);
    });
    block.appendChild(tuples);
    container.appendChild(block);
  });
}

const DV_ICONS = { demand:'?', 'memo-hit':'⚡', derive:'→', done:'✓', call:'↓', return:'↑', fail:'✗', try:'○', consume:'·' };

function dvRenderTree(container, steps, currentIdx) {
  container.innerHTML = '';
  steps.slice(0, currentIdx + 1).forEach((step, i) => {
    const node = document.createElement('div');
    node.className = `dv-tree-node type-${step.type}` + (i === currentIdx ? ' dv-current-node' : '');
    const indent = '  '.repeat(Math.max(0, step.depth || 0));
    node.innerHTML =
      `<span class="dv-dn-indent">${dvEsc(indent)}</span>` +
      `<span class="dv-dn-icon">${DV_ICONS[step.type] || '·'}</span>` +
      `<span class="dv-dn-label">${dvEsc(step.label)}</span>`;
    container.appendChild(node);
  });
  container.scrollTop = container.scrollHeight;
}

function dvRenderLog(container, steps, currentIdx) {
  container.innerHTML = '';
  steps.forEach((step, i) => {
    const tc = step.type.replace(/[^a-z]/g, '');
    const entry = document.createElement('div');
    entry.className = 'dv-log-entry' + (i === currentIdx ? ' dv-current' : '');
    entry.innerHTML =
      `<span class="dv-log-idx">${String(i).padStart(2,'0')}</span>` +
      `<span class="dv-log-type dvt-${tc}">${dvEsc(step.type)}</span>` +
      `<span class="dv-log-msg">${dvEsc(step.label)}</span>`;
    container.appendChild(entry);
  });
  const cur = container.querySelectorAll('.dv-log-entry')[currentIdx];
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

/* ── Base Visualizer ───────────────────────────────────────────── */
class DvVisualizer {
  constructor(prefix, interval = 450) {
    this._steps = []; this._idx = -1; this._timer = null;
    this._prefix = prefix; this._interval = interval;
  }
  push(step) {
    this._steps.push(step);
    if (this._idx === -1) this._idx = 0;
    else if (this._idx === this._steps.length - 2) this._idx = this._steps.length - 1;
    this._render(); return this;
  }
  reset()  { this._steps = []; this._idx = -1; this._stop(); this._render(); }
  next()   { if (this._idx < this._steps.length - 1) { this._idx++; this._render(); } else this._stop(); }
  prev()   { if (this._idx > 0) { this._idx--; this._render(); } }
  goTo(i)  { this._idx = Math.max(0, Math.min(this._steps.length - 1, i)); this._render(); }
  togglePlay() { this._timer ? this._stop() : this._play(); }
  _play() {
    if (this._idx >= this._steps.length - 1) this._idx = 0;
    const b = dvEl(this._prefix + '-play'); if(b) b.textContent = '■ Stop';
    this._timer = setInterval(() => this.next(), this._interval);
  }
  _stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    const b = dvEl(this._prefix + '-play'); if(b) b.textContent = '▶ Play';
  }
  _ui() {
    const n = this._steps.length, i = this._idx;
    const cur   = dvEl(this._prefix + '-cur');   if(cur)   cur.textContent   = n ? i + 1 : '—';
    const total = dvEl(this._prefix + '-total'); if(total) total.textContent = n || '—';
    const prev  = dvEl(this._prefix + '-prev');  if(prev)  prev.disabled     = i <= 0;
    const next  = dvEl(this._prefix + '-next');  if(next)  next.disabled     = i >= n - 1;
    const prog  = dvEl(this._prefix + '-progress');
    if(prog) prog.style.width = (n > 1 ? (i/(n-1))*100 : n ? 100 : 0) + '%';
  }
}

/* ── Naive Fixpoint Visualizer ─────────────────────────────────── */
class DvNaiveVisualizer extends DvVisualizer {
  constructor(prefix) { super(prefix, 380); this.queryRel = null; }

  _render() {
    this._ui();
    const p = this._prefix;
    if (this._idx < 0 || !this._steps.length) {
      ['output-rels','log','history'].forEach(s => { const e = dvEl(p+'-'+s); if(e) e.innerHTML=''; });
      const lb = dvEl(p+'-label'); if(lb) lb.textContent='—';
      const rb = dvEl(p+'-rule-box'); if(rb) rb.innerHTML='<span class="dv-empty-label">—</span>';
      const bi = dvEl(p+'-bindings'); if(bi) bi.innerHTML='<span class="dv-empty-label">{ }</span>';
      return;
    }
    const step = this._steps[this._idx];

    // label + delta badge
    const lb = dvEl(p+'-label'); if(lb) lb.textContent = step.iterLabel || step.label || '—';
    const td = step.totalDelta || 0;
    const db = dvEl(p+'-delta'); if(db) { db.textContent=`Δ ${td}`; db.className='dv-badge '+(td>0?'dv-badge-green':'dv-badge-amber'); }

    // rule box
    const rb = dvEl(p+'-rule-box');
    if (rb) {
      if (!step.rule) {
        rb.innerHTML = `<span class="dv-empty-label">${dvEsc(step.label)}</span>`;
      } else {
        const r = step.rule;
        const headStr = r.head.name + '(' + r.head.args.map(a=>a.name).join(', ') + ')';
        const bodyHtml = r.body.map((atom, i) => {
          const aStr = atom.name + '(' + atom.args.map(a=>a.name).join(', ') + ')';
          const done   = i < (step.bodyPos ?? r.body.length);
          const active = i === (step.bodyPos ?? -1);
          return `<span class="dv-rule-atom${done?' dv-atom-done':active?' dv-atom-active':''}">${dvEsc(aStr)}</span>`;
        }).join('<span class="dv-rule-sep">, </span>');
        rb.innerHTML =
          `<span class="dv-rule-head">${dvEsc(headStr)}</span>` +
          `<span class="dv-rule-neck"> :- </span>` + bodyHtml;
      }
    }

    // bindings
    const bi = dvEl(p+'-bindings');
    if (bi) {
      const env = step.env || {};
      const prevEnv = this._idx > 0 ? (this._steps[this._idx-1].env || {}) : {};
      const keys = Object.keys(env);
      bi.innerHTML = keys.length
        ? keys.map(k => `<span class="dv-binding${prevEnv[k]!==env[k]?' dv-fresh':''}">${dvEsc(k)} = ${dvEsc(env[k])}</span>`).join('')
        : '<span class="dv-empty-label">{ }</span>';
    }

    // relations
    const relEl = dvEl(p+'-output-rels');
    if (relEl) {
      const newT = step.newTuple ? { [step.newRel]: [step.newTuple] } : {};
      dvRenderRelations(relEl, step.db || {}, newT, this.queryRel);
      const total = Object.values(step.db||{}).reduce((s,a)=>s+a.length,0);
      const rbt = dvEl(p+'-rel-badge'); if(rbt) rbt.textContent = total + ' facts';
    }

    // log
    const logEl = dvEl(p+'-log'); if(logEl) dvRenderLog(logEl, this._steps, this._idx);

    // history
    const hist = dvEl(p+'-history');
    if (hist) {
      const iterBounds = this._steps.map((s,i) => s.type==='iter-start'?i:-1).filter(i=>i>=0);
      const ic = dvEl(p+'-iter-count'); if(ic) ic.textContent = iterBounds.length+' iters';
      hist.innerHTML = '';
      iterBounds.forEach((startIdx, n) => {
        const s = this._steps[startIdx];
        const isCur = this._idx >= startIdx && (n===iterBounds.length-1 || this._idx < iterBounds[n+1]);
        const row = document.createElement('div');
        row.className = 'dv-iter-chip' + (isCur ? ' dv-active-iter' : '');
        const dv2 = s.iterDelta; const dCol = dv2>0 ? 'var(--dv-green)' : 'var(--dv-text-dim)';
        row.innerHTML = `<span>${dvEsc(s.label||'iter '+n)}</span><span style="color:${dCol}">Δ${dv2??'?'}</span>`;
        row.onclick = () => this.goTo(startIdx);
        hist.appendChild(row);
      });
    }
  }
}

/* ── Demand-Driven Visualizer ──────────────────────────────────── */
/*
  PUBLIC API:
    viz.push({ type, depth, label, key?, value?, relation?, tuple?, facts?, memo? })
    Types: 'demand' | 'memo-hit' | 'derive' | 'done'
*/
class DvDemandVisualizer extends DvVisualizer {
  constructor(prefix) { super(prefix, 480); }

  _render() {
    this._ui();
    const p = this._prefix;
    if (this._idx < 0 || !this._steps.length) {
      ['tree','log','memo','facts'].forEach(s => { const e=dvEl(p+'-'+s); if(e) e.innerHTML=''; });
      return;
    }
    const step = this._steps[this._idx];

    const tb = dvEl(p+'-type-badge');
    if (tb) {
      tb.textContent = step.type;
      tb.className = 'dv-badge ' + ({demand:'dv-badge-blue','memo-hit':'dv-badge-green',derive:'dv-badge-amber',done:'dv-badge-amber'}[step.type]||'dv-badge-amber');
    }

    const treeEl = dvEl(p+'-tree'); if(treeEl) dvRenderTree(treeEl, this._steps, this._idx);
    const logEl  = dvEl(p+'-log');  if(logEl)  dvRenderLog(logEl,   this._steps, this._idx);

    // memo
    const memo = {};
    this._steps.slice(0, this._idx+1).forEach(s => {
      if (s.type==='memo-hit' && s.key) memo[s.key] = s.value||'✓';
      if (s.memo) Object.assign(memo, s.memo);
    });
    const memoKeys = Object.keys(memo);
    const mc = dvEl(p+'-memo-count'); if(mc) mc.textContent = memoKeys.length;
    const memoEl = dvEl(p+'-memo');
    if (memoEl) memoEl.innerHTML = memoKeys.length
      ? memoKeys.map(k=>`<div class="dv-kv-row"><span class="dv-kv-key">${dvEsc(k)}</span><span class="dv-kv-val">${dvEsc(memo[k])}</span></div>`).join('')
      : '<span class="dv-empty-label">empty</span>';

    // facts
    const facts = {};
    this._steps.slice(0, this._idx+1).forEach(s => {
      if ((s.type==='derive'||s.type==='done') && s.relation && s.tuple)
        (facts[s.relation]=facts[s.relation]||new Set()).add(s.tuple);
      if (s.facts) Object.entries(s.facts).forEach(([r,ts])=>{
        (facts[r]=facts[r]||new Set());
        (Array.isArray(ts)?ts:[ts]).forEach(t=>facts[r].add(t));
      });
    });
    const fRels = Object.keys(facts);
    const fc = dvEl(p+'-facts-count'); if(fc) fc.textContent = fRels.reduce((s,r)=>s+facts[r].size,0);
    const factsEl = dvEl(p+'-facts');
    if (factsEl) factsEl.innerHTML = fRels.length
      ? fRels.map(r=>`<div class="dv-kv-row"><span class="dv-kv-key">${dvEsc(r)}</span>${[...facts[r]].map(t=>`<span class="dv-tuple">${dvEsc(t)}</span>`).join('')}</div>`).join('')
      : '<span class="dv-empty-label">none yet</span>';
  }
}

/* ── Parsing Visualizer ────────────────────────────────────────── */
/*
  PUBLIC API:
    viz.push({ type, depth, label, pos?, rule?, tokens?, key?, value?, memo? })
    Types: 'call' | 'return' | 'fail' | 'try' | 'shift' | 'memo-hit'
*/
class DvParseVisualizer extends DvVisualizer {
  constructor(prefix) { super(prefix, 480); this._tokens = []; }

  _render() {
    this._ui();
    const p = this._prefix;
    if (this._idx < 0 || !this._steps.length) {
      ['tree','log','tokens','call-stack','memo'].forEach(s => { const e=dvEl(p+'-'+s); if(e) e.innerHTML=''; });
      return;
    }
    const step = this._steps[this._idx];
    const toks = this._steps.reduce((a,s) => s.tokens||a, []);
    if (JSON.stringify(toks) !== JSON.stringify(this._tokens)) this._tokens = toks;
    const pos = step.pos != null ? step.pos : -1;

    // tokens
    const tokEl = dvEl(p+'-tokens');
    if (tokEl) tokEl.innerHTML = this._tokens.length
      ? this._tokens.map((t,i)=>
          `<span class="dv-token${i<pos?' dv-consumed':''}${i===pos?' dv-current':''}${i===pos+1?' dv-lookahead':''}">${dvEsc(t)}</span>`
        ).join('') + `<span class="dv-pos-marker">pos:${pos}</span>`
      : '<span class="dv-empty-label">no tokens</span>';

    // type badge
    const tb = dvEl(p+'-type-badge');
    if (tb) {
      tb.textContent = step.type;
      tb.className = 'dv-badge '+({call:'dv-badge-blue',return:'dv-badge-green',fail:'dv-badge-red',try:'dv-badge-purple',consume:'dv-badge-amber','memo-hit':'dv-badge-green'}[step.type]||'dv-badge-amber');
    }

    // call stack
    const stack = [];
    this._steps.slice(0, this._idx+1).forEach(s => {
      if (s.type==='call') stack.push({ rule: s.rule||s.label, pos: s.pos });
      if (s.type==='return'||s.type==='fail') stack.pop();
    });
    const sd = dvEl(p+'-stack-depth'); if(sd) sd.textContent='depth '+stack.length;
    const sEl = dvEl(p+'-call-stack');
    if (sEl) sEl.innerHTML = stack.length
      ? stack.map((f,i)=>
          `<div class="dv-frame${i===stack.length-1?' dv-top-frame':''}">` +
          `<span class="dv-frame-rule">${dvEsc(f.rule)}</span><span class="dv-frame-pos">@${f.pos??'?'}</span></div>`
        ).join('')
      : '<span class="dv-empty-label" style="padding:4px;">empty</span>';

    // memo
    const memo = {};
    this._steps.slice(0, this._idx+1).forEach(s => {
      if (s.type==='memo-hit'&&s.key) memo[s.key]=s.value||'✓';
      if (s.memo) Object.assign(memo, s.memo);
    });
    const memoKeys = Object.keys(memo);
    const mc = dvEl(p+'-memo-count'); if(mc) mc.textContent=memoKeys.length;
    const memoEl = dvEl(p+'-memo');
    if (memoEl) memoEl.innerHTML = memoKeys.length
      ? memoKeys.map(k=>`<div class="dv-kv-row"><span class="dv-kv-key">${dvEsc(k)}</span><span class="dv-kv-val">${dvEsc(memo[k])}</span></div>`).join('')
      : '<span class="dv-empty-label">empty</span>';

    const treeEl = dvEl(p+'-tree'); if(treeEl) dvRenderTree(treeEl, this._steps, this._idx);
    const logEl  = dvEl(p+'-log');  if(logEl)  dvRenderLog(logEl,   this._steps, this._idx);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   DATALOG PARSER
   ─────────────────────────────────────────────────────────────────
   Handles:
     • atoms, Variables, _anonymous wildcards (renamed to _0, _1, …)
     • compound terms  f(a, b)
     • arithmetic terms  X + 1,  M + 1,  N <= 10
     • infix constraints in rule bodies:  X != Y,  N = M + 1,  N <= 10
     • negation-as-failure:  !atom(…)  or  !(body, …)
     • EDB facts with ground atom args
     • Rules with arbitrary body literals
═══════════════════════════════════════════════════════════════════ */
function dvParseDatalog(src) {
  // ── Tokeniser ───────────────────────────────────────────────
  // Order matters: multi-char ops before single-char ones
  const TOKEN_RE = /\/\/[^\n]*|%[^\n]*|:-|!=|<=|>=|=|[A-Za-z_][A-Za-z0-9_]*|\d+|[(),.|+\-*!]/g;
  const raw = [];
  let m;
  while ((m = TOKEN_RE.exec(src)) !== null) {
    const t = m[0];
    if (t.startsWith('//') || t.startsWith('%')) continue; // strip comments
    raw.push(t);
  }
  const tokens = raw;
  let pos = 0;
  let anonCount = 0;

  const peek  = (off=0) => tokens[pos + off] || '';
  const eat   = t  => { if (tokens[pos] !== t) throw new Error(`Expected '${t}', got '${tokens[pos]||'EOF'}' (token ${pos})`); return tokens[pos++]; };
  const eatId = () => {
    const t = tokens[pos++];
    if (!t || !/^[A-Za-z_]/.test(t)) throw new Error(`Expected identifier, got '${t||'EOF'}' (token ${pos-1})`);
    return t;
  };

  // ── Term parser (handles arithmetic sub-expressions) ────────
  // Returns an AST node: { type, name } | { type:'compound', name, args } | { type:'expr', op, left, right }
  function parsePrimary() {
    const t = tokens[pos];
    if (!t) throw new Error('Unexpected end of input');

    // Anonymous wildcard
    if (t === '_' || t === '_') {
      pos++;
      return { type: 'var', name: `_${anonCount++}` };
    }

    // Identifier or variable
    if (/^[A-Za-z_]/.test(t)) {
      const name = eatId();
      // Compound term  f(args)
      if (peek() === '(') {
        eat('(');
        const args = [parseTerm()];
        while (peek() === ',') { eat(','); args.push(parseTerm()); }
        eat(')');
        return { type: 'compound', name, args };
      }
      // Simple atom or variable
      return { type: /^[A-Z_]/.test(name) ? 'var' : 'atom', name };
    }

    // Number
    if (/^\d+$/.test(t)) {
      pos++;
      return { type: 'num', name: t };
    }

    // Parenthesised expression
    if (t === '(') {
      eat('(');
      const inner = parseTerm();
      eat(')');
      return inner;
    }

    throw new Error(`Unexpected token '${t}' (token ${pos})`);
  }

  // Arithmetic: left-to-right + - * (simple, no precedence needed for Datalog)
  function parseTerm() {
    let left = parsePrimary();
    while (['+', '-', '*'].includes(peek())) {
      const op = tokens[pos++];
      const right = parsePrimary();
      left = { type: 'expr', op, left, right };
    }
    return left;
  }

  // ── Body literal ─────────────────────────────────────────────
  // Returns one of:
  //   { type:'atom', name, args }             — normal positive literal
  //   { type:'constraint', op, left, right }  — X != Y, N <= 10, N = M+1
  //   { type:'negation', body: [...literals] }— !atom or !(body)
  function parseBodyLiteral() {
    // Negation:  !atom(…)  or  !(lit, lit, …)
    if (peek() === '!') {
      eat('!');
      if (peek() === '(') {
        // !(body block)
        eat('(');
        const inner = [parseBodyLiteral()];
        while (peek() === ',') { eat(','); inner.push(parseBodyLiteral()); }
        eat(')');
        return { type: 'negation', body: inner };
      }
      // !atom(…)
      const atom = parseBodyLiteral();
      return { type: 'negation', body: [atom] };
    }

    // Could be a term followed by a constraint operator
    const left = parseTerm();
    const op = peek();
    if (['!=', '<=', '>=', '='].includes(op)) {
      pos++;
      const right = parseTerm();
      return { type: 'constraint', op, left, right };
    }

    // Plain atom
    if (left.type === 'atom' || left.type === 'compound') return left;
    if (left.type === 'var') return left; // bare variable — unusual but parseable

    throw new Error(`Expected atom in body, got ${JSON.stringify(left)}`);
  }

  // ── Top-level clauses ────────────────────────────────────────
  const facts = {}, rules = [];

  // Serialise a term AST back to a string (for display / error messages)
  function termStr(t) {
    if (t.type === 'atom' || t.type === 'var' || t.type === 'num') return t.name;
    if (t.type === 'compound') return t.name + '(' + t.args.map(termStr).join(', ') + ')';
    if (t.type === 'expr') return `(${termStr(t.left)} ${t.op} ${termStr(t.right)})`;
    return '?';
  }

  while (pos < tokens.length) {
    const head = parseTerm();

    if (peek() === '.') {
      eat('.');
      // EDB fact — head must be compound with ground atoms
      if (head.type !== 'compound')
        throw new Error(`Fact must be a compound term, got: ${termStr(head)}`);
      if (!facts[head.name]) facts[head.name] = [];
      facts[head.name].push(head.args.map(a => {
        if (a.type !== 'atom' && a.type !== 'num')
          throw new Error(`Fact arguments must be atoms or numbers, got: ${termStr(a)}`);
        return a.name;
      }));

    } else if (peek() === ':-') {
      eat(':-');
      const body = [parseBodyLiteral()];
      while (peek() === ',') { eat(','); body.push(parseBodyLiteral()); }
      eat('.');
      rules.push({ head, body });

    } else {
      throw new Error(`Expected '.' or ':-', got '${peek()}' (token ${pos})`);
    }
  }

  return { facts, rules };
}

/* ═══════════════════════════════════════════════════════════════════
   NAIVE FIXPOINT SOLVER  (emits micro-steps)
═══════════════════════════════════════════════════════════════════ */
function dvNaiveSolve(program) {
  const { facts, rules } = program;
  const db = {};
  Object.entries(facts).forEach(([rel,ts]) => { db[rel] = new Set(ts.map(a=>'('+a.join(',')+')')); });
  const allRels = new Set([...Object.keys(db), ...rules.map(r=>r.head.name)]);
  allRels.forEach(r => { if(!db[r]) db[r]=new Set(); });

  const snap = () => { const o={}; allRels.forEach(r=>o[r]=[...db[r]]); return o; };

  // Pretty-print a body literal for display
  function litStr(lit) {
    if (!lit) return '?';
    if (lit.type === 'atom')       return lit.name + (lit.args ? '(' + lit.args.map(termStr).join(',') + ')' : '');
    if (lit.type === 'compound')   return lit.name + '(' + lit.args.map(termStr).join(',') + ')';
    if (lit.type === 'constraint') return termStr(lit.left) + ' ' + lit.op + ' ' + termStr(lit.right);
    if (lit.type === 'negation')   return '!' + lit.body.map(litStr).join(',');
    if (lit.type === 'var')        return lit.name;
    return JSON.stringify(lit);
  }
  function termStr(t) {
    if (!t) return '?';
    if (t.type === 'atom' || t.type === 'var' || t.type === 'num') return t.name;
    if (t.type === 'compound') return t.name + '(' + t.args.map(termStr).join(',') + ')';
    if (t.type === 'expr') return '(' + termStr(t.left) + t.op + termStr(t.right) + ')';
    return '?';
  }

  const ruleStr = rule => {
    const h = litStr(rule.head);
    const b = rule.body.map(litStr).join(', ');
    return h + ' :- ' + b;
  };

  const resolve = (t, env) => {
    if (!t) return null;
    if (t.type === 'atom' || t.type === 'num') return t.name;
    if (t.type === 'var')  return t.name === '_' ? null : (env[t.name] ?? null);
    return null;
  };

  // Evaluate an arithmetic expression to a number string under env
  function evalExpr(t, env) {
    if (t.type === 'num') return Number(t.name);
    if (t.type === 'var') { const v = env[t.name]; return v != null ? Number(v) : null; }
    if (t.type === 'atom') return Number(t.name); // numeric atom
    if (t.type === 'expr') {
      const l = evalExpr(t.left, env), r = evalExpr(t.right, env);
      if (l == null || r == null) return null;
      if (t.op === '+') return l + r;
      if (t.op === '-') return l - r;
      if (t.op === '*') return l * r;
    }
    return null;
  }

  const parseTup = s => s.slice(1,-1).split(',');
  const unify = (pats, data, env) => {
    if (!pats || pats.length !== data.length) return null;
    env = { ...env };
    for (let i = 0; i < pats.length; i++) {
      const p = pats[i], d = data[i];
      if      (p.type === 'atom' || p.type === 'num') { if (p.name !== d) return null; }
      else if (p.type === 'var') {
        if (p.name.startsWith('_')) { /* anonymous — skip */ }
        else if (env[p.name] != null) { if (env[p.name] !== d) return null; }
        else env[p.name] = d;
      } else return null;
    }
    return env;
  };

  // Check a constraint literal under env; returns bool
  function checkConstraint(lit, env) {
    const lv = evalExpr(lit.left, env);
    const rv = evalExpr(lit.right, env);
    if (lv == null || rv == null) {
      // Try string comparison for atoms
      const ls = resolve(lit.left, env), rs = resolve(lit.right, env);
      if (ls == null || rs == null) return false;
      if (lit.op === '!=') return ls !== rs;
      if (lit.op === '=')  return ls === rs;
      return false;
    }
    if (lit.op === '!=') return lv !== rv;
    if (lit.op === '=')  return lv === rv;
    if (lit.op === '<=') return lv <= rv;
    if (lit.op === '>=') return lv >= rv;
    return false;
  }

  // Bind constraint: if op is '=' and one side is a free var, bind it
  function bindConstraint(lit, env) {
    if (lit.op !== '=') return checkConstraint(lit, env) ? env : null;
    // Try to evaluate right side and bind left free var
    if (lit.left.type === 'var' && env[lit.left.name] == null) {
      const rv = evalExpr(lit.right, env);
      if (rv == null) return checkConstraint(lit, env) ? env : null;
      return { ...env, [lit.left.name]: String(rv) };
    }
    if (lit.right.type === 'var' && env[lit.right.name] == null) {
      const lv = evalExpr(lit.left, env);
      if (lv == null) return checkConstraint(lit, env) ? env : null;
      return { ...env, [lit.right.name]: String(lv) };
    }
    return checkConstraint(lit, env) ? env : null;
  }

  const steps = [];
  let iteration = 0, runningDelta = 0;

  while (true) {
    const iterNew = [];
    const iterLabel = iteration === 0 ? 'Iteration 0' : 'Iteration ' + iteration;

    steps.push({ type:'iter-start', label:iterLabel, iterLabel, iterDelta:'?',
                 db:snap(), env:{}, rule:null, totalDelta:runningDelta });

    for (const rule of rules) {
      steps.push({ type:'rule-try', label:'try  '+ruleStr(rule), iterLabel,
                   rule, bodyPos:0, env:{}, db:snap(), totalDelta:runningDelta });

      // ── Trace unifications ──────────────────────────────────
      // Only trace standard atoms (skip constraints/negations for the step trace)
      const traceBody = rule.body.filter(l => l.type === 'atom' || l.type === 'compound');
      (function evalTrace(body, env, depth) {
        if (!body.length) return;
        const [atom, ...rest] = body;
        const name = atom.name;
        let anyMatch = false;
        for (const ts of db[name] || []) {
          const args = atom.args || [];
          const newEnv = unify(args, parseTup(ts), env);
          if (newEnv !== null) {
            anyMatch = true;
            const aStr = name + '(' + args.map(a => newEnv[a.name] || a.name).join(',') + ')';
            steps.push({ type:'unif-ok', label:`unify ${aStr} ✓  [${ts}]`, iterLabel,
                         rule, bodyPos:depth+1, env:newEnv, db:snap(), totalDelta:runningDelta });
            evalTrace(rest, newEnv, depth + 1);
          }
        }
        if (!anyMatch) {
          const aStr = name + '(' + (atom.args||[]).map(a => env[a.name]||a.name).join(',') + ')';
          steps.push({ type:'unif-fail', label:`unify ${aStr} ✗`, iterLabel,
                       rule, bodyPos:depth, env, db:snap(), totalDelta:runningDelta });
        }
      })(traceBody, {}, 0);

      // ── Collect all satisfying envs for this rule ───────────
      (function collectAndDerive(body, env) {
        if (!body.length) {
          const headArgs = (rule.head.args || []).map(a => {
            const v = resolve(a, env);
            if (v != null) return v;
            if (a.type === 'expr') { const ev = evalExpr(a, env); return ev != null ? String(ev) : null; }
            return null;
          });
          if (headArgs.some(a => a == null)) return;
          const key = '(' + headArgs.join(',') + ')';
          const rel = rule.head.name;
          const isNew = !db[rel].has(key);
          if (isNew) { db[rel].add(key); runningDelta++; iterNew.push(key); }
          steps.push({ type: isNew ? 'derive-new' : 'derive-dup',
            label: (isNew ? 'derive  ' : 'dup  ') + rel + key + (isNew ? '  ✓ NEW' : '  (known)'),
            iterLabel, rule, bodyPos: rule.body.length, env,
            newRel: isNew ? rel : null, newTuple: isNew ? key : null,
            db: snap(), totalDelta: runningDelta });
          return;
        }

        const [lit, ...rest] = body;

        if (lit.type === 'atom' || lit.type === 'compound') {
          const args = lit.args || [];
          for (const ts of db[lit.name] || []) {
            const newEnv = unify(args, parseTup(ts), env);
            if (newEnv !== null) collectAndDerive(rest, newEnv);
          }
          return;
        }

        if (lit.type === 'constraint') {
          const newEnv = bindConstraint(lit, env);
          if (newEnv !== null) collectAndDerive(rest, newEnv);
          return;
        }

        if (lit.type === 'negation') {
          // Stratified negation: check whether any tuple satisfies the negated body
          let satisfied = false;
          (function checkNeg(nbody, nenv) {
            if (!nbody.length) { satisfied = true; return; }
            const [h, ...t] = nbody;
            if (h.type === 'atom' || h.type === 'compound') {
              for (const ts of db[h.name] || []) {
                const ne = unify(h.args || [], parseTup(ts), nenv);
                if (ne !== null) checkNeg(t, ne);
                if (satisfied) return;
              }
            }
          })(lit.body, env);
          if (!satisfied) collectAndDerive(rest, env);
          return;
        }

        // Unknown literal type — skip
        collectAndDerive(rest, env);
      })(rule.body, {});
    }

    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].type === 'iter-start') { steps[i].iterDelta = iterNew.length; break; }
    }

    steps.push({ type:'iter-end',
      label:`end iter ${iteration}  Δ=${iterNew.length}` + (iterNew.length === 0 ? '  — fixpoint ✓' : ''),
      iterLabel, iterDelta:iterNew.length, db:snap(), env:{}, rule:null, totalDelta:runningDelta });

    if (iterNew.length === 0) break;
    if (iteration > 200) {
      steps.push({ type:'iter-end', label:'Stopped: >200 iterations',
                   db:snap(), env:{}, rule:null, iterDelta:0, totalDelta:runningDelta });
      break;
    }
    iteration++;
  }
  return steps;
}

/* ═══════════════════════════════════════════════════════════════════
   THE MONAD  (translated from Racket)
   ─────────────────────────────────────────────────────────────────
   Type:  M a  =  (κ: a[] → State → State) → State → State
          State = Map<key, { vals: Set<string>, conts: κ[] }>
            where each key maps to the set of value-lists seen so far
            (serialised to JSON strings for set membership) and the
            list of continuations waiting for new values.

   The monad is a continuation monad composed with a state monad.
   It supports nondeterminism (each), memoisation, and demand-driven
   fixed-point iteration: when deliver() produces a new value it fans
   it out to every registered continuation, including those that
   registered after the computation started.

   This is a direct, line-for-line translation of the Racket source.
═══════════════════════════════════════════════════════════════════ */

// return :: ...values → M values
//   (return . vs) κ = κ vs
//   Wrap zero or more values into the monad.
function mReturn(...vs) {
  return kappa => s => kappa(vs)(s);
}

// bind :: M a → (...a → M b) → M b
//   (>>= c f) κ = c (λ vs → (apply f vs) κ)
//   Sequence two monadic computations; spread the value array into f.
function mBind(c, f) {
  return kappa => s => c(vs => f(...vs)(kappa))(s);
}

// each :: ...M a → M a
//   ((each . cs) κ) s = foldl (λ c s → (c κ) s) s cs
//   Nondeterministic choice: run every branch, threading state.
function mEach(...cs) {
  return kappa => s => cs.reduce((st, c) => c(kappa)(st), s);
}

// fail :: M a  (each with zero branches)
const mFail = mEach();

// deliver :: key → continuation
//   (((deliver key) vs) s):
//     Look up key in s.  If vs already in vals → no-op (fixed point).
//     Otherwise add vs to vals and fan out to every waiting κ.
function deliver(key) {
  return vs => s => {
    const vsKey = JSON.stringify(vs);           // serialise for Set membership
    const entry = s.get(key) || { vals: new Set(), conts: [] };
    if (entry.vals.has(vsKey)) return s;        // already seen — fixed point
    const newVals = new Set(entry.vals);
    newVals.add(vsKey);
    const s1 = new Map(s).set(key, { vals: newVals, conts: entry.conts });
    // fan out to every registered continuation
    return entry.conts.reduce((st, kappa) => kappa(vs)(st), s1);
  };
}

// memo :: tag → (...args → M a) → (...args → M a)
//   Memoises f under (tag, args).
//   First call:  create entry {vals:∅, conts:[κ]}, run f(args) with deliver(key).
//   Later calls: add κ to conts, replay all cached value-lists through κ.
function memo(tag, f) {
  return (...args) => {
    const key = JSON.stringify([tag, ...args]);
    return kappa => s => {
      const entry = s.get(key);
      if (!entry) {
        // First time seen: register κ, then compute
        const s1 = new Map(s).set(key, { vals: new Set(), conts: [kappa] });
        return f(...args)(deliver(key))(s1);
      } else {
        // Seen before: register κ, replay cached results
        const s1 = new Map(s).set(key, { vals: entry.vals, conts: [...entry.conts, kappa] });
        return [...entry.vals].reduce((st, vsKey) => {
          return kappa(JSON.parse(vsKey))(st);
        }, s1);
      }
    };
  };
}

// run :: M a → State
//   Execute a computation with the trivial continuation (ignore results),
//   starting from an empty memo table.  Returns the final state.
function mRun(c) {
  return c(_vs => s => s)(new Map());
}

/* ═══════════════════════════════════════════════════════════════════
   DEMAND-DRIVEN DATALOG SOLVER  (uses the monad correctly)
   ─────────────────────────────────────────────────────────────────
   Architecture mirrors the Racket original:

   One memoised function per relation — queryRel(rel, arg0, arg1, ...)
   is keyed by ["rel", rel, arg0, arg1, ...] in the state map.

   EDB facts are pre-seeded into the state before execution begins.
   Each fact `rel(a,b)` populates the entry for the fully-ground key
   ["rel","rel","a","b"] with its binding environment, so any body
   atom that resolves to a ground EDB lookup gets an immediate memo
   hit — no scanning, no redundant derive steps in the trace.

   Partially-ground lookups (e.g. parent(tom, Y)) still run the
   queryRel computation, but within it the fully-ground sub-lookups
   it performs are already cached.

   When a recursive call hits the same key a second time, memo()
   registers the new continuation and replays cached values through
   it.  When deliver() fires for a new tuple, it fans out to every
   continuation that registered for that key — this is what drives
   recursive rules to a fixed point.
═══════════════════════════════════════════════════════════════════ */
function dvDemandSolve(program, queryTerm, viz) {
  const { facts, rules } = program;

  // ── Pure helpers (no monad) ──────────────────────────────────
  function unify(pats, data, env) {
    env = { ...env };
    if (pats.length !== data.length) return null;
    for (let i = 0; i < pats.length; i++) {
      const p = pats[i], d = data[i];
      if      (p.type === 'atom') { if (p.name !== d) return null; }
      else if (p.type === 'var')  {
        if (env[p.name] != null) { if (env[p.name] !== d) return null; }
        else env[p.name] = d;
      } else return null;
    }
    return env;
  }

  function resolve(term, env) {
    if (term.type === 'atom') return term.name;
    if (term.type === 'var')  return env[term.name] ?? null;
    return null;
  }

  const groundArg = (a, env) => resolve(a, env) ?? a.name;

  // ── Depth counter (cosmetic only — never enters memo keys) ────
  let depth = 0;

  // ── Pre-seed state with EDB facts ────────────────────────────
  // For each fact rel(a,b,…) we populate the fully-ground memo entry
  // ["rel","rel","a","b",…] with the binding env {} (facts are ground,
  // so they bind nothing — the caller unifies against the args).
  //
  // We build the initial state map by hand, bypassing memo(), so that
  // the entries look exactly as if deliver() had already fired for them.
  // The value stored per entry is a set of JSON-serialised value-lists,
  // matching what memo/deliver use internally.
  function buildInitialState() {
    const s = new Map();
    for (const [rel, argLists] of Object.entries(facts)) {
      for (const argList of argLists) {
        // Fully-ground key: ["rel", rel, arg0, arg1, ...]
        const key = JSON.stringify(['rel', rel, ...argList]);
        // Value: the binding env is empty (facts are already ground)
        const vsKey = JSON.stringify([{}]);
        const existing = s.get(key) || { vals: new Set(), conts: [] };
        const newVals = new Set(existing.vals);
        newVals.add(vsKey);
        s.set(key, { vals: newVals, conts: existing.conts });

        // Emit a viz step so the memo table shows the seeded facts
        viz.push({
          type: 'memo-hit',
          depth: 0,
          label: `seed EDB  ${rel}(${argList.join(',')})`,
          key: `${rel}(${argList.join(',')})`,
          value: `(${argList.join(',')})`,
          relation: rel,
          tuple: `(${argList.join(',')})`
        });
      }
    }
    return s;
  }

  // ── The single memoised relation-lookup function ───────────────
  const queryRel = memo('rel', (rel, ...groundArgs) => {
    const callLabel = `${rel}(${groundArgs.join(',')})`;
    viz.push({ type: 'demand', depth, label: `demand  ${callLabel}` });
    depth++;

    // ── EDB: match ground facts ──────────────────────────────
    // For a fully-ground call the entry is already in the state and
    // memo() will have replayed it before this body even runs — so
    // these branches handle partially-ground calls where at least one
    // query arg is still a free variable name.
    const edbBranches = (facts[rel] || []).map(argList => {
      const env = {};
      let ok = true;
      for (let i = 0; i < groundArgs.length && ok; i++) {
        const qa = groundArgs[i];
        const da = argList[i];
        if (da === undefined) { ok = false; break; }
        if (/^[A-Z_]/.test(qa)) { env[qa] = da; }
        else if (qa !== da)     { ok = false; }
      }
      if (!ok) return mFail;
      // EDB facts are pre-known ground truth — show as memo-hit, not derive
      const factLabel = `${rel}(${argList.join(',')})`;
      viz.push({ type: 'memo-hit', depth, label: `EDB  ${factLabel}`,
                 key: factLabel, value: `(${argList.join(',')})`,
                 relation: rel, tuple: `(${argList.join(',')})` });
      return mReturn(env);
    });

    // ── IDB: evaluate matching rules ─────────────────────────
    const idbBranches = rules
      .filter(r => r.head.name === rel && r.head.args.length === groundArgs.length)
      .map(rule => {
        const initEnv = {};
        let ok = true;
        for (let i = 0; i < rule.head.args.length && ok; i++) {
          const pa = rule.head.args[i];
          const qa = groundArgs[i];
          if (pa.type === 'atom') {
            if (!/^[A-Z_]/.test(qa) && qa !== pa.name) { ok = false; }
          } else if (pa.type === 'var') {
            if (!/^[A-Z_]/.test(qa)) initEnv[pa.name] = qa;
          } else { ok = false; }
        }
        if (!ok) return mFail;

        const ruleLabel = rule.head.name + '(' + rule.head.args.map(a=>a.name).join(',') + ')' +
                          ' :- ' + rule.body.map(a => {
                            if (!a.args) return a.name;
                            return a.name + '(' + a.args.map(x=>x.name).join(',') + ')';
                          }).join(', ');
        viz.push({ type: 'demand', depth, label: `rule  ${ruleLabel}` });
        return evalBody(rule.body, initEnv, rule);
      });

    depth--;
    return mEach(...edbBranches, ...idbBranches);
  });

  // ── evalBody :: [atom] → env → rule → M env ───────────────────
  function evalBody(body, env, rule) {
    if (!body.length) return mReturn(env);
    const [atom, ...rest] = body;
    const gArgs = atom.args ? atom.args.map(a => groundArg(a, env)) : [];
    const atomLabel = `${atom.name}(${gArgs.join(',')})`;
    viz.push({ type: 'demand', depth: depth + 1, label: `lookup  ${atomLabel}` });

    return mBind(queryRel(atom.name, ...gArgs), newEnv => {
      const merged = { ...env, ...newEnv };
      return evalBody(rest, merged, rule);
    });
  }

  // ── Top-level query ───────────────────────────────────────────
  const rel    = queryTerm.name;
  const gArgs  = queryTerm.args.map(a => groundArg(a, {}));
  const qLabel = `${rel}(${gArgs.join(',')})`;

  viz.push({ type: 'demand', depth: 0, label: `query  ${qLabel}` });

  const computation = mBind(queryRel(rel, ...gArgs), env => {
    const headArgs = queryTerm.args.map(a => resolve(a, env) ?? groundArg(a, env));
    const ts = `(${headArgs.join(',')})`;
    viz.push({ type: 'derive', depth: 1, label: `answer  ${rel}${ts}`,
               relation: rel, tuple: ts });
    return mReturn(ts);
  });

  // Run with the pre-seeded state instead of an empty Map
  const initialState = buildInitialState();
  const finalState   = computation((_vs => s => s))(initialState);

  // Summary step
  const entryKey = JSON.stringify(['rel', rel, ...gArgs]);
  const entry    = finalState.get(entryKey);
  const answers  = entry
    ? [...entry.vals].map(v => {
        const env = JSON.parse(v)[0];
        const args = queryTerm.args.map(a => resolve(a, env) ?? groundArg(a, env));
        return `(${args.join(',')})`;
      })
    : [];

  viz.push({
    type: 'done', depth: 0,
    label: `done  ${qLabel} → [${answers.join(', ')}]`,
    memo: { [qLabel]: `[${answers.join(', ')}]` }
  });
}


/* ═══════════════════════════════════════════════════════════════════
   RECURSIVE DESCENT PARSER
   ─────────────────────────────────────────────────────────────────
   Faithful translation of the Racket fixpoint parser monad.

   Parser monad type:
     Parser a  =  (i: number, κ: (a[], i) → s → s) → s → s
     where  i  is the current token index
            κ  is the success continuation receiving (values, newPos)
            s  is the memo table  Map<json([tag,i]), {results, conts}>

   Combinators (direct translation from Racket):
     pUnit(...xs)(i, κ)    =  κ(xs, i)               — succeed, don't advance
     pBind(c, f)(i, κ)     =  c(i, (xs,i2) => f(...xs)(i2, κ))
     pAlt(...cs)(i, κ)     =  fold over cs, threading state (∨ in Racket)
     pFail                 =  pAlt()                  — (⊥)
     pMemo(tag, c)(i, κ)   =  table on [tag,i]; deliver fans out to waiters
     pConsume(t)           =  match one specific token, advance position
     pConsumeNum           =  match any number token, advance position

   Grammar (left-recursive — handled by the fixpoint):
     Expr   → Expr '+' Term  |  Expr '-' Term  |  Term
     Term   → Term '*' Factor  |  Term '/' Factor  |  Factor
     Factor → '(' Expr ')'  |  num

   How left recursion works:
   visMemo('Expr', body)(pos=0, κ) is called for the first time.
   It creates entry {results:∅, conts:[κ]} then runs body(0, deliver).
   The left-recursive branch immediately calls pExpr(0, …) again —
   this hits the same entry, registers a new continuation, and returns
   nothing (no results yet).  The base case Term→Factor→num succeeds
   first, calling deliver([«1»], 1).  deliver fans «1»@1 to all
   registered continuations — including the one from the left-recursive
   branch — which may produce «(1+2)»@3, which deliver fans again,
   eventually reaching «((1+2)+3)»@5.  When no new results appear the
   fixed point is reached.
═══════════════════════════════════════════════════════════════════ */
function dvParseSolve(inputText, viz) {
  const tokens = inputText.trim().match(/[0-9]+|\+|-|\*|\/|\(|\)/g);
  if (!tokens || !tokens.length) return;

  // ── Parser monad primitives ───────────────────────────────────

  // pUnit :: ...a → Parser a
  // (unit . xs) i κ = κ xs i
  const pUnit = (...xs) => (i, κ) => s => κ(xs, i)(s);

  // pBind :: Parser a → (...a → Parser b) → Parser b
  // (>>= c f) i κ = c i (λ (xs i) → ((apply f xs) i κ))
  const pBind = (c, f) => (i, κ) => s => c(i, (xs, i2) => f(...xs)(i2, κ))(s);

  // pAlt :: ...Parser a → Parser a
  // (∨ . cs) i κ = fold compose (c i κ) over cs
  const pAlt = (...cs) => (i, κ) => s =>
    cs.reduce((acc, c) => c(i, κ)(acc), s);

  const pFail = pAlt();

  // pMemo :: tag → Parser a → Parser a
  // (memo tag c) i κ — keys on [tag, i]
  // First call: register κ, run c with deliver continuation.
  // Later calls: register κ, replay all cached results through it.
  // deliver: called by c for each new result; stores it and fans to all waiters.
  const pMemo = (tag, c) => (i, κ) => s => {
    const key = JSON.stringify([tag, i]);
    const entry = s.get(key);
    if (!entry) {
      const s1 = new Map(s).set(key, { results: new Set(), conts: [κ] });
      const deliver = (xs, i2) => s2 => {
        const rk = JSON.stringify([xs, i2]);
        const e = s2.get(key);
        if (!e || e.results.has(rk)) return s2;            // fixed point for this result
        const nr = new Set(e.results); nr.add(rk);
        const s3 = new Map(s2).set(key, { results: nr, conts: e.conts });
        return e.conts.reduce((st, k) => k(xs, i2)(st), s3); // fan out
      };
      return c(i, deliver)(s1);
    } else {
      const s1 = new Map(s).set(key, { results: entry.results, conts: [...entry.conts, κ] });
      return [...entry.results].reduce((st, rk) => {
        const [xs, i2] = JSON.parse(rk);
        return κ(xs, i2)(st);
      }, s1);
    }
  };

  // ── Token consumers ───────────────────────────────────────────
  // These read `depth` at fire time — correct because depth is updated
  // before calling into visMemo, which calls the body, which calls these.

  const pConsume = t => (i, κ) => s => {
    if (tokens[i] !== t) return s;
    viz.push({ type:'consume', depth, label:`consume '${t}'`, pos:i });
    return κ([t], i + 1)(s);
  };

  const pConsumeNum = (i, κ) => s => {
    const t = tokens[i];
    if (!t || !/^[0-9]+$/.test(t)) return s;
    viz.push({ type:'consume', depth, label:`consume '${t}'`, pos:i });
    return κ([t], i + 1)(s);
  };

  // ── depth counter ─────────────────────────────────────────────
  // Purely cosmetic — incremented before running a rule body,
  // decremented after.  Never enters the memo key.
  let depth = 1;

  // ── Instrumented memo ─────────────────────────────────────────
  // visMemo wraps pMemo to emit call/return/memo-hit viz steps.
  const visMemo = (tag, c) => (i, κ) => s => {
    const key = JSON.stringify([tag, i]);
    const entry = s.get(key);
    const d = depth;

    if (!entry) {
      viz.push({ type:'call', depth:d, label:`call ${tag} @${i}`,
                 pos:i, rule:tag,
                 tokens: (tag === 'Expr' && i === 0) ? tokens : undefined });
      depth++;
      const s1 = new Map(s).set(key, { results: new Set(), conts: [κ] });
      const deliver = (xs, i2) => s2 => {
        const rk = JSON.stringify([xs, i2]);
        const e = s2.get(key);
        if (!e || e.results.has(rk)) return s2;
        const nr = new Set(e.results); nr.add(rk);
        const s3 = new Map(s2).set(key, { results: nr, conts: e.conts });
        viz.push({ type:'return', depth:d, label:`return ${tag} → ${xs[0]} @${i2}`,
                   pos:i2, rule:tag,
                   memo:{ [`${tag}@${i}`]: `${xs[0]} @${i2}` } });
        return e.conts.reduce((st, k) => k(xs, i2)(st), s3);
      };
      const result = c(i, deliver)(s1);
      depth--;
      return result;
    } else {
      const cachedVals = [...entry.results].map(rk => JSON.parse(rk)[0][0]);
      viz.push({ type:'memo-hit', depth:d,
                 label:`memo-hit ${tag}@${i}` + (cachedVals.length
                   ? ` → ${cachedVals.join(', ')}`
                   : ' (in progress — left recursion)'),
                 key:`${tag}@${i}`,
                 value: cachedVals.length ? cachedVals.join(', ') : '…' });
      const s1 = new Map(s).set(key, { results: entry.results, conts: [...entry.conts, κ] });
      return [...entry.results].reduce((st, rk) => {
        const [xs, i2] = JSON.parse(rk);
        return κ(xs, i2)(st);
      }, s1);
    }
  };

  // ── Grammar ───────────────────────────────────────────────────
  // Forward declarations for mutual recursion — mirrors Racket's `fix`.
  let pExpr, pTerm, pFactor;

  // Expr → Expr '+' Term  |  Expr '-' Term  |  Term
  pExpr = visMemo('Expr', pAlt(
    pBind(
      pBind(
        (i, k) => pExpr(i, k),
        left => pBind(
          pAlt(pConsume('+'), pConsume('-')),
          op => pUnit(left, op)
        )
      ),
      (left, op) => pBind(
        (i, k) => pTerm(i, k),
        right => pUnit(`(${left}${op}${right})`)
      )
    ),
    (i, k) => pTerm(i, k)
  ));

  // Term → Term '*' Factor  |  Term '/' Factor  |  Factor
  pTerm = visMemo('Term', pAlt(
    pBind(
      pBind(
        (i, k) => pTerm(i, k),
        left => pBind(
          pAlt(pConsume('*'), pConsume('/')),
          op => pUnit(left, op)
        )
      ),
      (left, op) => pBind(
        (i, k) => pFactor(i, k),
        right => pUnit(`(${left}${op}${right})`)
      )
    ),
    (i, k) => pFactor(i, k)
  ));

  // Factor → '(' Expr ')'  |  num
  pFactor = visMemo('Factor', pAlt(
    pBind(pConsume('('), _ =>
      pBind((i, k) => pExpr(i, k), inner =>
        pBind(pConsume(')'), _ =>
          pUnit(inner)))),
    pConsumeNum
  ));

  // ── Run ───────────────────────────────────────────────────────
  viz.push({ type:'call', depth:0, label:'parse start', pos:0, rule:'root', tokens });

  pExpr(0, (xs, i) => s => {
    if (i !== tokens.length) return s;
    viz.push({ type:'return', depth:0, label:`✓ complete: ${xs[0]}`, pos:i, rule:'root' });
    return new Map(s).set('result', xs);
  })(new Map());
}

/* expose for widget scripts */
window.DvNaiveVisualizer  = DvNaiveVisualizer;
window.DvDemandVisualizer = DvDemandVisualizer;
window.DvParseVisualizer  = DvParseVisualizer;
window.dvParseDatalog     = dvParseDatalog;
window.dvNaiveSolve       = dvNaiveSolve;
window.dvDemandSolve      = dvDemandSolve;
window.dvParseSolve       = dvParseSolve;
window.dvEl               = dvEl;
window.dvShowErr          = dvShowErr;
window.dvHideErr          = dvHideErr;
// monad primitives — for extending the widgets with your own computations
window.mReturn = mReturn;
window.mBind   = mBind;
window.mEach   = mEach;
window.mFail   = mFail;
window.memo    = memo;
window.deliver = deliver;
window.mRun    = mRun;
