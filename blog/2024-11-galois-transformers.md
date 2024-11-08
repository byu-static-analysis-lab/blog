---
slug: galois-transformers
title: Paper - Galois Transformers and Modular Abstract Interpreters
date: 2024-11-07T12:00
authors:
  - koby
  - tim
tags: [paper, galois connections, monad transformers, abstract interpreters]
---

Galois Transformers and Modular Abstract Interpreters [@darais_galois_2015] provides a way to do abstract interpretation *in general*, without having to specify a particular language or analysis. This paper is fairly mathematically dense, so I'll do my best to break down what I understood from it. This paper is also a good starting point if you want to understand Dr. Germane's paper on Full Control-Flow Sensitivity.

<!--truncate-->

Ultimately, the goal of the paper is basically to have some function (let's call it `run_analysis`), that can be passed a collection of parameters that specify the language on which to run an analysis, as well as what analysis should be run. The coolest thing in my mind is that they were able to do this in such a way that as long as you can prove a couple of properties about the arguments you pass to `run_analysis`, the soundness of the analysis is given to you for free.

## Breaking Down the Abstract

I think a good way to understand what is going on in this paper will be to break down the abstract and understand each of its claims.

### The Problem Statement

> The design and implementation of static analyzers has become increasingly systematic. Yet for a given language or analysis feature, it often requires tedious and error prone work to implement an analyzer and prove it sound. In short, static analysis features and their proofs of soundness do not compose well, causing a dearth of reuse in both implementation and metatheory.

This part is fairly self explanatory. The authors identified a classic software engineering problem: we're repeating ourselves a lot when we write up analyzers and their proofs. Is there some way we can take the parts that get repeated and abstract them out, parameterized on the portions that actually are different between different analyses?

Now would probably be a good time to note that the paper uses the word "abstract" in a couple of different ways. One of them is the traditional programming sense, that means something like "generalize". If we're repeating ourselves, let's separate out the portions that are repeated from the portions that are different. The other way it uses abstract is in the term "abstract interpreter". See [abstract interpretation](./2024-11-abstract-interpretation.md) for more information on what that means, if you're unfamiliar with the concept.

### Solution

> We solve the problem of systematically constructing static analyzers by introducing Galois transformers: monad transformers that transport Galois connection properties.

"Systematically constructing" here just means that they have an algorithm for combining the parameters (the language and analysis properties) to produce an analysis that is always sound, i.e. the `run_analysis` function is defined in the paper.

"Galois transformers" are (as the title suggests) the biggest new concept of the paper. They are defined as "monad transformers that transport Galois connection properties". Monad transformers are a special kind of function that take in a monad and produce a different monad, preserving the monad laws. The reason that we care about them is they allow us to essentially "stack" monads. For instance, there is a State Monad Transformer called $ S^t $ (monad transformers are usually written with some symbol followed by a superscript `t`). When $ S^t $ is applied to a different monad (say, the `Option` monad), it "adds" the state effect to the monad. You can then chain these to combine effects in a highly composable way.

"Galois connection properties" is a whole topic in and of itself that I may write an article on at some point. The TL;DR here though (as far as I understand it) is that if you have two sets, $A$ and $\widehat{A}$, and a "Galois connection" between them, there is a sort of mapping between them. This mapping is used in several different ways in the paper, which I'll get into a little more later on. For now, here is a more formal definition of Galois connections. Given two partial orders, $(A, \leq)$ and $(\widehat{A}, \sqsubseteq)$, and functions $\alpha : A \rightarrow \widehat{A}$ and $\gamma : \widehat{A} \rightarrow A$ for converting between them, then there is a Galois connection between them if for any $a \in A$ and $\widehat{a} \in \widehat{A}$, $a \leq (\gamma \, \widehat{a}) \Leftrightarrow (\alpha \, a) \sqsubseteq \widehat{a}$. Note that the names here are suggestive of concrete and abstract domains, but Galois connections aren't specific to abstract interpretation. Intuitively, this definition means that there is a way to convert between the two sets that preserves the partial order.

There are two ways the paper uses Galois connections. One of them is to formalize the correspondence between concrete and abstract domains. See [abstract interpretation](./2024-11-abstract-interpretation.md) for more details of what that means. The other has to do with how they define "running" the analysis. The paper defines a "monadic interpreter", which takes an expression of type $Exp$ and returns an expression wrapped in a monad $m(Exp)$. The monad in this case is specific to the particular language and analysis. For reasons that I don't fully understand yet, they state that this monadic function "cannot be iterated to least-fixed-point to execute the analysis." Instead, they define a transition system that defines a step relation between configurations of type $\Sigma$. They then prove a Galois connection between this relation, $\Sigma \rightarrow \Sigma$ and the monadic function $Exp \rightarrow m(Exp)$. The transition system *can* be used in a least-fixed-point computation. The takeaway seems to be that this allows them to define a concept of execution, even though at first that seems tricky.

:::info[Tim]
I believe the answer to your question is as follows:

The monadic function "cannot be iterated to least-fixed-point to execute the analysis" because the monad itself only maps expressions to monadic values.
We need the monad to correspond to a transition system where we can reify the configuration $\Sigma$ (whose components are implicit and modularized in the monad) in such a way that we can see if a particular $\Sigma$ has already been visited. That way we can iterate to a fixed-point by collecting all configurations that have already been seen, and running unseen configurations through the monad to get another set of states.

Without this connection, we wouldn't know which configurations still need to be run, and which configurations have been produced by the monad.

Abstracting definitional interpreters [@darais_abstracting_2017] shows how you can reify the configurations within the monad and iterate to a fixed-point using another nondeterminism monad and cache.
That paper also does the analysis in big-step style.
This paper however, limits the nondeterminism monad to the inherent nondeterminism due to the abstract domains. 
:::

Now for the key part: they show that there are certain monad transformers (which they call "Galois transformers") that, when applied, preserve the Galois connections of the monads they are applied to. This is a critical step in what they are trying to accomplish, because it now means that if you apply a series of Galois transformers, as long as your original monad was sound and each Galois transformer was sound, they result is also sound by construction. The proofs compose!

### Accomplishments

> In concert with a monadic interpreter, we define a library of monad transformers that implement building blocks for classic analysis parameters like context, path, and heap (in)sensitivity. 

They also define a few arguments that can be passed to our hypothetical `run_analysis` function. These define things like state and nondeterminism effects for a language, as well as parameterizing the analysis based on [sensitivity](./2024-11-flow-sensitivity.md).

> Moreover, these can be composed together independent of the language being analyzed.
> Significantly, a Galois transformer can be proved sound once and for all, making it a reusable analysis component. As new analysis features and abstractions are developed and mixed in, soundness proofs need not be reconstructed, as the composition of a monad transformer stack is sound by virtue of its constituents. Galois transformers provide a viable foundation for reusable and composable metatheory for program analysis.

These statements summarize what we've been talking about with the fact that the proofs compose nicely. 

> Finally, these Galois transformers shift the level of abstraction in analysis design and implementation to a level where non-specialists have the ability to synthesize sound analyzers over a number of parameters.

Finally, they make the assertion that, since the individual pieces are so easily composable, someone who is not familiar with the mathematical foundations of program analysis could still create an analyzer, as long as they were given the building blocks. This is a pretty cool assertion, although I'm not sure they really justify it much.
