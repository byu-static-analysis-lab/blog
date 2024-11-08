---
slug: fine-grained-reduction-theory-for-effect-handlers
title: Paper - A General Fine-Grained Reduction Theory for Effect Handlers
date: 2024-11-08T12:00
authors:
  - tim
tags: [paper, abstract interpreters, reduction semantics, effect handlers, abstract machine]
---

A General Fine-Grained Reduction Theory for Effect Handlers [@sieczkowski_general_2023]
presents a theory of effect handlers that can be used for term rewriting systems,
and provides a few different abstract machines for effect handlers.

A significant contribution of this paper I believe is that it provides
a top down small-step semantics for effect handlers, which is a bit unusual.

<!--truncate-->

One disadvantages of most reduction semantics for effect handlers is that
they require being able to capture a reduction context itself as a term in the language.
This is easy to understand in principle, but makes the reduction semantics
hard to translate into an abstract machine.

The fine-grained reduction theory presented in this paper makes it easy to apply the
normal refocusing method to come up with an abstract machine for algebraic effects (see [this paper](./2024-11-refocusing-reduction.md)).

The crux of the idea is that continuations can either be built from the top-down or the bottom-up. 

Typical reduction semantics for algebraic effects capture the reduction context and wrap it in a closure to plug the context. This is effectively a bottom-up approach.

For example in Generalized Evidence Passing for Effect Handlers [@xie_generalized_2021], 
Koka's evaluation rules look as follows:

$$
\begin{align*}
(app)\;\; &(λx.\; e) v ⟶ e[x:=v]  \\
(handler)\;\; &\texttt{handler}\; h\; f ⟶ \texttt{handle}\; h\; (f\; ()) \\
(return)\;\; &\texttt{handle}\; h\; v ⟶ v  \\
(perform)\;\; &\texttt{handle}\; h\; E[\texttt{perform}\; op\; v] ⟶ 
  f\; v\; (λx.\; \texttt{handle}\; h\; E[x])\; \texttt{iff}\; op \notin bop(E) ∧ (op ⟼ f)  \in h
\end{align*}
$$

In this we can see the caputring of $E$ and wrapping up in a lambda to build the continuation.
Additionally we see the nature of `deep` effect handlers where the continuation reinstates
the handler frame on top of the evaluation context.

While later in the Koka paper they present a monad for building up the continuation piece by piece, this is still a bottom-up treatment and composition of elementary evaluation contexts. 

Instead the top down treatment presented in this paper, builds the continuation on the way down, and only uses lambda functions.


The abstract machine presented in the paper is pretty straightforward, though as mentioned in the paper it is a `hybrid` machine because the context changes how evaluation proceeds. In particular
evaluation changes depending on whether it is in the context of one or more handlers, versus if it is finishing up a computation in the top level continuation.

Later they introduce a similarity relation to equate terms in the fine-grained calculus and a normal calculus. This part is pretty involved since the rewriting of handlers in the fine-grained calculus ends up changing a lot of terms, and the capturing of a resumption in the regular calculus introduces an eta expansion for the application. 


Next they present three core proofs: Simulation, Confluence, and Standardization.

Simulation states that it doesn't matter whether you use the fine-grained or non-local semantics you get the same result. i.e. fine-grained simulates non-local and vice versa. One step in one either could correspond to many steps in the other, so you have to consider the transitive closure. Additionally the similarity relation is needed since the terms could look different but be syntactically or otherwise equivalent.

Confluence of the relation is the diamond property meaning that if an expression reduces to two different expressions, then there exists an expression that each of those expressions can reduce further to.

Standardization states the any reduction sequence that reaches head-normal form can be split into a sequence that reaches a normal form followed by an internal reduction sequence. This is tricky with effect handlers due to the hybrid nature of the semantics in which let and lift behave differently depending if a handler surrounds them.


Using those proofs they show that the reduction theory is a foundation for an equational theory which is sound with respect to the non-local semantics. In other words, rewriting pieces of programs using this theory will result in the same program, even if you switch back to a non-local semantics to execute the rest. 