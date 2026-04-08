---
slug: fixpoint-monad
title: A Small yet Powerful Tool for Your Belt
authors:
  name: Alec Davis
  title: A Small yet Powerful Tool for Your Belt
  url: https://github.com/byu-static-analysis-lab/blog
  image_url: https://github.com/byu-static-analysis-lab/blog
tags: [fixpoints, datalog, parsing]
---

What do recursive-descent parsing, Datalog, and program analysis all have in common?
They all use **fixed points** to efficiently solve their respective problems.

We have a small library in our lab that enables us to do our work efficiently — it can be
used for parsing, abstract interpretation, implementing Datalog, and performing type inference.
This article covers the basics of fixed points, walks through a Datalog example to build
intuition, and then shows how the same library powers a novel left-recursive parser.
At the end we link to our GitHub repository.

<!--
  SETUP: Copy datalog-shared.css and datalog-shared.js into your static/ folder,
  then add the following to your docusaurus.config.js scripts/stylesheets arrays:

    stylesheets: ['/datalog-shared.css'],
    scripts: [{ src: '/datalog-shared.js', async: false }],
-->

## What is a fixpoint?

A fixpoint (or fixed point) of a function is a value that maps to itself. For `f(x) = x²`,
the fixpoints are `0` and `1` — the values where `x = x²`. You can think of a fixpoint as a
stable solution where input doesn't change the output.

In a Datalog interpreter, the inputs and outputs are sets of facts. Take this parent-child
relationship:

```datalog
parent(tom, bob).
parent(bob, ann).
parent(bob, pat).

ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).
```

### What is a fixpoint solver?

A fixpoint solver finds a stable solution for a given equation by applying a function on an
input until the output converges — the limit of that iteration is the fixpoint. For the Datalog
example we want to answer: `ancestor(tom, ann)?`

### Where fixpoint solvers appear in computer science

They appear in data-flow analysis (what values might a variable hold?), type inference (figuring
out types so code compiles correctly), and abstract interpretation (proving program properties).
Our lab has also found a novel use for fixpoint solvers in parsing — more on that below.

## A high-level understanding of our library

A fixpoint solver has some looping structure over a **state** — a mapping from an identifier to a
set of possible values. We know a solver is done when it stops learning new mappings or new
possible values.

### The Naive Approach

The naive approach loops over all mappings and checks for progress. New facts emerge from
evaluation, and we keep iterating until nothing new is learned.

Using the ancestor example, we start with:

```
{
  parent(tom, bob) ↦ { true }
  parent(bob, ann) ↦ { true }
  parent(bob, pat) ↦ { true }
}
```

After one pass we derive the base ancestor facts. After a second pass we derive the transitive
ones (`ancestor(tom, ann)`, `ancestor(tom, pat)`). A third pass confirms nothing new — the fixed
point is reached. Try it yourself:

<div style={{marginBottom: '2rem'}}>

<div class="dv-widget" id="naive-widget">

  <!-- ── Header ─────────────────────────────────────────── -->
  <div class="dv-widget-header">
    <span class="dv-widget-title">Naive Fixpoint</span>
    <span class="dv-widget-subtitle">step through each rule firing and unification</span>
  </div>

  <!-- ── Editor + controls ──────────────────────────────── -->
  <div style="padding:12px 14px 0;">
    <div class="dv-editor-wrap">
      <div class="dv-editor-label">Datalog Program</div>
      <textarea id="naive-editor" rows="8" spellcheck="false"></textarea>
    </div>
    <div class="dv-controls" style="margin-top:8px;">
      <button class="dv-btn" onclick="loadPreset()">⬡ Ancestor Example</button>
      <input id="naive-query-input" type="text" placeholder="highlight relation, e.g.  ancestor" />
      <button class="dv-btn dv-btn-primary" onclick="runNaive()">▶ Run</button>
    </div>
    <div class="dv-error" id="naive-error"></div>
  </div>

  <!-- ── Main layout ────────────────────────────────────── -->
  <div class="dv-layout-main-side" style="padding:12px 14px 0;">

    <!-- Left: step detail -->
    <div class="dv-vstack">

      <!-- Active step panel -->
      <div class="dv-panel">
        <div class="dv-panel-header">
          <span class="dv-panel-title" id="naive-label">—</span>
          <span class="dv-badge dv-badge-amber" id="naive-delta">Δ 0</span>
        </div>

        <!-- Rule box -->
        <div style="padding:8px 12px 4px;">
          <div class="dv-panel-title" style="margin-bottom:5px;">Active Rule</div>
          <div class="dv-rule-box" id="naive-rule-box">
            <span class="dv-empty-label">—</span>
          </div>
        </div>

        <!-- Bindings -->
        <div>
          <div class="dv-panel-title" style="padding:5px 12px 0;">Bindings</div>
          <div class="dv-bindings" id="naive-bindings">
            <span class="dv-empty-label">{ }</span>
          </div>
        </div>

        <!-- Progress + controls -->
        <div class="dv-progress"><div class="dv-progress-fill" id="naive-progress" style="width:0%"></div></div>
        <div class="dv-step-controls">
          <button class="dv-ctrl" id="naive-prev" onclick="viz.prev()">◀</button>
          <button class="dv-ctrl" id="naive-play" onclick="viz.togglePlay()">▶ Play</button>
          <button class="dv-ctrl" id="naive-next" onclick="viz.next()">▶|</button>
          <span class="dv-step-counter">Step <b id="naive-cur">—</b> / <b id="naive-total">—</b></span>
        </div>
      </div>

      <!-- Step log -->
      <div class="dv-panel">
        <div class="dv-panel-header"><span class="dv-panel-title">Step Log</span></div>
        <div class="dv-log" id="naive-log" style="height:180px;"></div>
      </div>

    </div>

    <!-- Right: relations + history -->
    <div class="dv-vstack">

      <div class="dv-panel">
        <div class="dv-panel-header">
          <span class="dv-panel-title">Relations</span>
          <span class="dv-badge dv-badge-blue" id="naive-rel-badge">—</span>
        </div>
        <div style="padding:10px 12px;">
          <div class="dv-two-col" id="naive-output-rels"></div>
        </div>
      </div>

      <div class="dv-panel" style="flex:1;">
        <div class="dv-panel-header">
          <span class="dv-panel-title">Iteration History</span>
          <span class="dv-badge dv-badge-amber" id="naive-iter-count">0 iters</span>
        </div>
        <div id="naive-history" style="max-height:280px;overflow-y:auto;"></div>
      </div>

    </div>
  </div>

  <div style="height:14px;"></div>
</div>

<script>
'use strict';
const ANCESTOR = `parent(tom, bob).
parent(bob, ann).
parent(bob, pat).

ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).`;

// The visualizer prefix must match the id prefixes in the HTML above
const viz = new DvNaiveVisualizer('naive');
window.NaiveVisualizer = viz;   // expose for external use / your monad

function loadPreset() {
  dvEl('naive-editor').value = ANCESTOR;
  dvEl('naive-query-input').value = 'ancestor';
  runNaive();
}

function runNaive() {
  dvHideErr('naive-error');
  viz.reset();
  const src = dvEl('naive-editor').value.trim();
  if (!src) { dvShowErr('naive-error', 'Program is empty'); return; }
  let program;
  try { program = dvParseDatalog(src); } catch(e) { dvShowErr('naive-error', 'Parse error: ' + e.message); return; }
  viz.queryRel = dvEl('naive-query-input').value.trim() || null;
  let steps;
  try { steps = dvNaiveSolve(program); } catch(e) { dvShowErr('naive-error', 'Solver error: ' + e.message); return; }
  steps.forEach(s => viz.push(s));
  viz.goTo(0);
}

// Auto-load ancestor example on startup
window.addEventListener('DOMContentLoaded', loadPreset);
</script>

</div>

#### Downsides to the naive approach

The naive approach repeats work on every pass — roughly `O(n × m)` where *n* is the number of
iterations and *m* is the cost of each pass. Even with memoization, we re-evaluate work that is
already settled.

### Our Approach

There is a useful observation about how data flows through a fixpoint solver: you get a
**dependency graph**. We exploit this by storing callbacks alongside each state's values.
Callbacks fire whenever a new value is discovered — so whenever we make progress, we only notify
whoever needs to know. Combined with memoization, only meaningful work is ever done.

Using the same ancestor example, tracking demand on the fly lets us find `ancestor(tom, ann)` in
two iterations instead of three. Step through the demand-driven version:

<div style={{marginBottom: '2rem'}}>

<div class="dv-widget">

  <!-- ── Header ─────────────────────────────────────────── -->
  <div class="dv-widget-header">
    <span class="dv-widget-title">Demand-Driven</span>
    <span class="dv-widget-subtitle">memoized top-down evaluation — wire your monad via <code style="font-size:10px;background:rgba(0,0,0,0.06);padding:1px 5px;border-radius:3px;">DemandVisualizer.push(step)</code></span>
  </div>

  <!-- ── Editor + controls ──────────────────────────────── -->
  <div style="padding:12px 14px 0;">
    <div class="dv-editor-wrap">
      <div class="dv-editor-label">Datalog Program</div>
      <textarea id="demand-editor" rows="7" spellcheck="false"></textarea>
    </div>
    <div class="dv-controls" style="margin-top:8px;">
      <button class="dv-btn" onclick="loadPreset()">⬡ Ancestor Example</button>
      <input id="demand-query-input" type="text" placeholder="query, e.g.  ancestor(tom, ann)" />
      <button class="dv-btn dv-btn-primary" onclick="runDemand()">▶ Run</button>
    </div>
    <div class="dv-error" id="demand-error"></div>
  </div>

  <!-- ── Main layout ────────────────────────────────────── -->
  <div class="dv-layout-main-side" style="padding:12px 14px 0;">

    <!-- Left column: trace + log -->
    <div class="dv-vstack">

      <div class="dv-panel">
        <div class="dv-panel-header">
          <span class="dv-panel-title">Resolution Trace</span>
          <span class="dv-badge dv-badge-blue" id="demand-type-badge">—</span>
        </div>
        <div class="dv-tree" id="demand-tree"></div>
        <div class="dv-progress"><div class="dv-progress-fill" id="demand-progress" style="width:0%"></div></div>
        <div class="dv-step-controls">
          <button class="dv-ctrl" id="demand-prev" onclick="viz.prev()">◀</button>
          <button class="dv-ctrl" id="demand-play" onclick="viz.togglePlay()">▶ Play</button>
          <button class="dv-ctrl" id="demand-next" onclick="viz.next()">▶|</button>
          <span class="dv-step-counter">Step <b id="demand-cur">—</b> / <b id="demand-total">—</b></span>
        </div>
      </div>

      <div class="dv-panel">
        <div class="dv-panel-header"><span class="dv-panel-title">Step Log</span></div>
        <div class="dv-log" id="demand-log"></div>
      </div>

    </div>

    <!-- Right column: memo + facts -->
    <div class="dv-vstack">

      <div class="dv-panel">
        <div class="dv-panel-header">
          <span class="dv-panel-title">Memo Table</span>
          <span class="dv-badge dv-badge-green" id="demand-memo-count">0</span>
        </div>
        <div class="dv-kv" id="demand-memo">
          <span class="dv-empty-label">empty</span>
        </div>
      </div>

      <div class="dv-panel">
        <div class="dv-panel-header">
          <span class="dv-panel-title">Derived Facts</span>
          <span class="dv-badge dv-badge-amber" id="demand-facts-count">0</span>
        </div>
        <div class="dv-kv" id="demand-facts">
          <span class="dv-empty-label">none yet</span>
        </div>
      </div>

    </div>
  </div>

  <div style="height:14px;"></div>
</div>

<script>
'use strict';
const ANCESTOR = `parent(tom, bob).
parent(bob, ann).
parent(bob, pat).

ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).`;

const viz = new DvDemandVisualizer('demand');
window.DemandVisualizer = viz;  // expose for your monad: DemandVisualizer.push(step)

function loadPreset() {
  dvEl('demand-editor').value = ANCESTOR;
  dvEl('demand-query-input').value = 'ancestor(tom, ann)';
  runDemand();
}

function parseQueryTerm(qStr) {
  const toks = qStr.match(/[A-Za-z_][A-Za-z0-9_]*|[(),]/g) || [];
  let p = 0;
  const name = toks[p++];
  if (!name) throw new Error('Empty query');
  if (toks[p] !== '(') throw new Error('Query must be compound, e.g. rel(a,b)');
  p++;
  const args = [];
  const parseArg = () => ({ type: /^[A-Z_]/.test(toks[p])?'var':'atom', name: toks[p++] });
  args.push(parseArg());
  while (toks[p] === ',') { p++; args.push(parseArg()); }
  if (toks[p] !== ')') throw new Error("Expected ')'");
  return { type: 'compound', name, args };
}

function runDemand() {
  dvHideErr('demand-error');
  viz.reset();
  const src = dvEl('demand-editor').value.trim();
  if (!src) { dvShowErr('demand-error', 'Program is empty'); return; }
  let program;
  try { program = dvParseDatalog(src); } catch(e) { dvShowErr('demand-error', 'Parse error: ' + e.message); return; }
  const qStr = dvEl('demand-query-input').value.trim();
  if (!qStr) { dvShowErr('demand-error', 'Enter a query, e.g. ancestor(tom, ann)'); return; }
  let queryTerm;
  try { queryTerm = parseQueryTerm(qStr); } catch(e) { dvShowErr('demand-error', 'Query error: ' + e.message); return; }
  try { dvDemandSolve(program, queryTerm, viz); } catch(e) { dvShowErr('demand-error', 'Solver error: ' + e.message); return; }
  viz.goTo(0);
}

window.addEventListener('DOMContentLoaded', loadPreset);
</script>

</div>

## How our library works

Our library uses a **monad** to handle modularity (as long as your language has higher-order
functions, you can implement the algorithm). The memoizing fixpoint monad is composed with a
state monad, using continuations as the callback mechanism for delivering new facts on demand.

## Fixed-point parsing

A novel use case our lab discovered is viewing parsing as a fixed-point problem.

### Motivation

Most students learn parsing via recursive descent, where functions represent grammar rules —
a one-to-one mapping between code and grammar. Parser combinators extend this further, making
parsers composable and reusable.

The Achilles' heel of recursive descent is **left recursion**: when a grammar rule expands on its
own left side, directly or indirectly. In Python:

```python
def parse_minus(input, index):
    left, index = parse_minus(input, index)  # infinite loop!
    _, index = parse_minus_symbol(input, index)
    right, index = parse_minus(input, index)
    return MinusExpr(left, right), index
```

We crash before getting anywhere useful. The traditional fix is to rewrite the grammar — but
that breaks the one-to-one mapping between grammar and code.

### Parsing as a fixed-point problem

When we view grammar rules as facts with results associated with them, we get a recursive-descent
framework that handles left recursion naturally. Grammar rules become keys in our memoized state;
parse results are the values; and demand propagation handles the recursion without blowing the stack.

#### Example: subtraction

Subtraction is left-associative. In BNF:

```
<number>   ::= Number
<minus>    ::= "-"
<subtract> ::= <subtract> <minus> <number> | <number>
```

A naive recursive-descent implementation crashes immediately. With our fixpoint approach, parsing
`1 - 1` proceeds by tracking demand and memoizing results step by step — arriving at
`("1 - 1", 2)` correctly without any stack overflow. The widget below demonstrates this with a
full arithmetic grammar including left-recursive rules:

<div style={{marginBottom: '2rem'}}>

<div class="dv-widget">

  <!-- ── Header ─────────────────────────────────────────── -->
  <div class="dv-widget-header">
    <span class="dv-widget-title">Parsing</span>
    <span class="dv-widget-subtitle">recursive descent with memoization — same monad as demand-driven</span>
  </div>

  <!-- ── Grammar reference ──────────────────────────────── -->
  <div style="padding:12px 14px 0;">
    <div class="dv-panel">
      <div class="dv-panel-header">
        <span class="dv-panel-title">Grammar (left-recursive — handled by the fixpoint monad)</span>
      </div>
      <div style="padding:10px 14px; font-family:'IBM Plex Mono',monospace; font-size:12px; line-height:2; display:grid; grid-template-columns: auto 1fr; gap:0 8px;">
        <span style="color:var(--dv-amber); font-weight:600; text-align:right;">Expr</span>
        <span style="color:var(--dv-text-dim);">→
          <span style="color:var(--dv-amber);">Expr</span>
          <span style="color:var(--dv-blue);">'+'</span>
          <span style="color:var(--dv-text);">Term</span>
          <span style="color:var(--dv-text-dim);">  |</span>
          <span style="color:var(--dv-amber);">Expr</span>
          <span style="color:var(--dv-blue);">'-'</span>
          <span style="color:var(--dv-text);">Term</span>
          <span style="color:var(--dv-text-dim);">  |</span>
          <span style="color:var(--dv-text);">Term</span>
          <span style="color:var(--dv-text-dim); font-size:10px; margin-left:8px;">← left-recursive</span>
        </span>

        <span style="color:var(--dv-amber); font-weight:600; text-align:right;">Term</span>
        <span style="color:var(--dv-text-dim);">→
          <span style="color:var(--dv-amber);">Term</span>
          <span style="color:var(--dv-blue);">'*'</span>
          <span style="color:var(--dv-text);">Factor</span>
          <span style="color:var(--dv-text-dim);">  |</span>
          <span style="color:var(--dv-amber);">Term</span>
          <span style="color:var(--dv-blue);">'/'</span>
          <span style="color:var(--dv-text);">Factor</span>
          <span style="color:var(--dv-text-dim);">  |</span>
          <span style="color:var(--dv-text);">Factor</span>
          <span style="color:var(--dv-text-dim); font-size:10px; margin-left:8px;">← left-recursive</span>
        </span>

        <span style="color:var(--dv-amber); font-weight:600; text-align:right;">Factor</span>
        <span style="color:var(--dv-text-dim);">→
          <span style="color:var(--dv-blue);">'('</span>
          <span style="color:var(--dv-text);">Expr</span>
          <span style="color:var(--dv-blue);">')'</span>
          <span style="color:var(--dv-text-dim);">  |</span>
          <span style="color:var(--dv-text);">num</span>
        </span>

        <span style="color:var(--dv-text-dim); font-weight:500; text-align:right; font-size:11px;">num</span>
        <span style="color:var(--dv-text-dim); font-size:11px;">one or more digits: <span style="color:var(--dv-blue);">0</span> <span style="color:var(--dv-blue);">1</span> <span style="color:var(--dv-blue);">42</span> <span style="color:var(--dv-blue);">100</span> …</span>
      </div>
    </div>
  </div>

  <!-- ── Input + controls ───────────────────────────────── -->
  <div style="padding:10px 14px 0;">
    <div class="dv-editor-wrap">
      <div class="dv-editor-label">Input Expression</div>
      <textarea id="parse-input" rows="2" spellcheck="false" style="min-height:48px;"></textarea>
    </div>
    <div class="dv-controls" style="margin-top:8px;">
      <button class="dv-btn" onclick="loadPreset('1 + 2 * 3')">⬡ 1 + 2 * 3</button>
      <button class="dv-btn" onclick="loadPreset('1 + 2 + 3')">⬡ 1 + 2 + 3</button>
      <button class="dv-btn" onclick="loadPreset('(1 + 2) * 3')">⬡ (1 + 2) * 3</button>
      <button class="dv-btn dv-btn-primary" onclick="runParse()">▶ Run</button>
    </div>
    <div class="dv-error" id="parse-error"></div>
  </div>

  <!-- ── Token strip ────────────────────────────────────── -->
  <div style="padding:10px 14px 0;">
    <div class="dv-panel">
      <div class="dv-panel-header"><span class="dv-panel-title">Tokens</span></div>
      <div class="dv-token-strip" id="parse-tokens">
        <span class="dv-empty-label">no tokens</span>
      </div>
    </div>
  </div>

  <!-- ── Main layout ────────────────────────────────────── -->
  <div class="dv-layout-main-side" style="padding:10px 14px 0;">

    <!-- Left: call stack + trace -->
    <div class="dv-vstack">

      <!-- Call stack -->
      <div class="dv-panel">
        <div class="dv-panel-header">
          <span class="dv-panel-title">Call Stack</span>
          <span class="dv-badge dv-badge-blue" id="parse-stack-depth">depth 0</span>
        </div>
        <div class="dv-call-stack" id="parse-call-stack" style="max-height:150px;overflow-y:auto;">
          <span class="dv-empty-label" style="padding:4px;">empty</span>
        </div>
      </div>

      <!-- Resolution trace -->
      <div class="dv-panel">
        <div class="dv-panel-header">
          <span class="dv-panel-title">Resolution Trace</span>
          <span class="dv-badge dv-badge-amber" id="parse-type-badge">—</span>
        </div>
        <div class="dv-tree" id="parse-tree"></div>
        <div class="dv-progress"><div class="dv-progress-fill" id="parse-progress" style="width:0%"></div></div>
        <div class="dv-step-controls">
          <button class="dv-ctrl" id="parse-prev" onclick="viz.prev()">◀</button>
          <button class="dv-ctrl" id="parse-play" onclick="viz.togglePlay()">▶ Play</button>
          <button class="dv-ctrl" id="parse-next" onclick="viz.next()">▶|</button>
          <span class="dv-step-counter">Step <b id="parse-cur">—</b> / <b id="parse-total">—</b></span>
        </div>
      </div>

    </div>

    <!-- Right: memo + log -->
    <div class="dv-vstack">

      <div class="dv-panel">
        <div class="dv-panel-header">
          <span class="dv-panel-title">Memo Table</span>
          <span class="dv-badge dv-badge-green" id="parse-memo-count">0</span>
        </div>
        <div class="dv-kv" id="parse-memo">
          <span class="dv-empty-label">empty</span>
        </div>
      </div>

      <div class="dv-panel">
        <div class="dv-panel-header"><span class="dv-panel-title">Step Log</span></div>
        <div class="dv-log" id="parse-log" style="height:260px;"></div>
      </div>

    </div>
  </div>

  <div style="height:14px;"></div>
</div>

<script>
'use strict';
const viz = new DvParseVisualizer('parse');
window.ParseVisualizer = viz;  // expose for your parser monad: ParseVisualizer.push(step)

function loadPreset(expr) {
  dvEl('parse-input').value = expr || '1 + 2 * 3';
  runParse();
}

function runParse() {
  dvHideErr('parse-error');
  viz.reset();
  const text = dvEl('parse-input').value.trim();
  if (!text) { dvShowErr('parse-error', 'Input is empty'); return; }
  try { dvParseSolve(text, viz); } catch(e) { dvShowErr('parse-error', e.message); return; }
  viz.goTo(0);
}

window.addEventListener('DOMContentLoaded', () => loadPreset('1 + 2 * 3'));
</script>

</div>

We know we are done when one of the result tuples contains the full length of the input string —
no further progress is possible beyond that point.

## The end

Hopefully you learned something useful that you can apply to your own programs. Fixed-point
solvers are a surprisingly general tool — once you see them in one domain, you start spotting
them everywhere.

You can find our GitHub repository here.
