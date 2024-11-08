---
slug: refocusing-reduction
title: Paper - Refocusing in Reduction Semantics
date: 2024-11-08T12:00
authors:
  - tim
tags: [paper, abstract interpreters, reduction semantics]
---

Refocusing in Reduction Semantics [@danvy_refocusing_2004] presents a way to go from
a reduction semantics to an recfocused pre-abstract machine, and eventually to an abstract machine. The paper is a good read after being introduced to reduction semantics and abstract machines, and has a few simple walkthroughs of how to actually apply the theory.

<!--truncate-->

The goal of this paper is to systematize the development of abstract machines based on
a reduction semantics. 

### Reduction Semantics

Reduction semantics involve three distinct steps:
- `decompose`: rules for breaking apart expressions into a term that can be reduced and its surrounding evaluation contexts (aka reduction contexts) 
- `reduction` / `contraction`: rules for how a term should be reduced
- `plug`: rules for how to recompose a full program expression given an evaluation context and a term

In reduction semantics some terms are considered fully reduced (values), and others can be decomposed. In general a term can be decomposed in many ways, however 

Often reduction semantics satisfy the property that there is a unique *complete* decomposition. A decomposition is *complete* iff the term it decomposes into a term that is trivially reducible (not a value, and not itself containing a complete decomposition). For example, the call-by-value simple lambda calculus semantics has the following reduction contexts

$C ::= [] \mid app(C,t) \mid app(v,C)$

where $C$ denotes a reduction context, $t$ a term, and $v$ a value, with $[]$ being a hole.

Crucially the restriction on the first term of the $app$ being either an evaluation context, or a value makes this decomposition unique and specifies a left-to-right evaluation order.

### Deriving An Abstract Machine

Given this property, the paper shows how to derive an abstract machine from it.

Intuitively, instead of finding the decomposition and replugging after every step, we can
instead traverse the reduction contexts of the previous decomposition to find the next
reduction step and recompose the evaluation contexts to obtain the new evaluation context.
In this way we can merge all intermediate steps of `plug` followed by `reduction`. The paper
calls this the `refocus` step.

After merging `plug` and `reduction`, the only thing that we need to get rid of is to inline the `refocus` step itself to get a properly tail recursive abstract machine. 

Of course the paper goes into more detail, and considers two separate `refocus` functions, one
which applies when the expression reduces to another potential redux, and another when it reduces to a value. 
After inlining both, the differences don't exactly matter, since they are now just part of the machine transitions.
However, it is useful to understand how the machine is derived, since you don't always have an abstract machine, but do know how to select the next statement to reduce.

## Conclusion

The conclusion of the paper states:

> We have presented a structural result about reduction semantics with context-free grammars of values, reduction contexts, and redexes, and satisfying a unique-decomposition property. These conditions are quite general: they hold for deterministic languages and also for oracle-based non-deterministic languages.

I appreciate the examples that they showed to make this claim more concrete - instead of solely in terms of context-free grammars, but it is nice to know that there is very little syntactic restrictions, and that the conditions for applying it are rather general.

> The construction of the refocus function suggests a convenient definition of the decompose function that directly connects one-step reduction and evaluation in the form of an abstract machine. It also suggests a practical method to obtain a reduction semantics out of an abstract machine.

I wish they spent more time connecting this - how to go in the reverse direction. It is also interesting that they don't talk about the restriction to `one-step` reductions. Is that a restriction only going in the reverse, or is it a restriction in the forward direction as well.

:::note
A many step strategy is apparently one in which a whole set of redexes is contracted simultaneously

As such, the restriction makes sense and I believe applies in both directions. What would an abstract machine that performs multiple steps simultaneously even look like? 
:::