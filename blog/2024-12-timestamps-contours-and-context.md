---
slug: timestamps-contours-context
title: Topic - Timestamps, Contours, and Context
date: 2024-12-04T12:00
authors:
  - tim
tags: [context sensitivity, control flow analysis]
---

Timestamps, contours and context are some pretty general terms that are often conflated or used somewhat interchangeably in the literature.
This post will try to disambiguate the three concepts and distill each into their origin, intended purpose, and nuances. 

<!--truncate-->

## Contours

Contours originate from *Shiver's $k$-CFA* [@shivers_control-flow_1991], and are a way to track the call stack of a program.
A contour is a sequence of $k$ functions labels tracking the history of the computation. The very act of making the contour part of the state space
passively segments the potential states of the program into different contexts.

## Timestamps

Timestamps are described in *Abstracting Abstract Machines* [@van_horn_abstracting_2010] as "an old idea in program analysis [...] that dynamically allocated storage can be represented by the state 
of the computation at allocation time. That is, allocation strategies can be based on a (representation) of the machine history." In AAM they call contours
a specific choice of timestamp, but the general idea is that timestamps encompass any way of representing the information you need to allocate storage.
In particular the abstract machine in AAM intentionally leaves timestamps abstract to allow for different choices of timestamps.
Timestamps are potentially updated at each step of the machine, and are used solely for the purpose of allocation.

## Sensitivity and Context Sensitivity

Finally we have the notion of context sensitivity and context in general. Context sensitivity is usually distinguished and used in the context of
flow and field sensitivities. While there are many ways of allocating using timestamps, different ways of allocating storage can be used to break up
the state space in different ways. The particular kind of sensitivity will determine where you get the most precision in your analysis.
For example a flow-sensitive analysis will allocate based on the flow of the program - including which branch of an if statement you are in.
In contrast, a field-sensitive analysis will allocate based on different combinations of field accesses. Context sensitivity usually refers to using the
calling context as a way to distinguish different states. The expectation is that functions called from different places will usually return different results,
because each call site will have different sets of arguments. The paper *Allocation Characterizes Polyvariance* [@gilray_allocation_2016], discusses 
a wide range of sensitivities (call-sensitive, cartesian-produce, polymorphic-splitting, object-sensitivity, type-sensitivity, etc) 
and how each one can be characterized by only a change in allocation strategy. To get this flexibility, they let
the allocator have access to arbitrary historical information ("instrumentation") which is an additional component of the states to keep track of
what the allocator needs access to. This instrumentation fulfills the same role as timestamps in my understanding.

## Summary

In summary, timestamps or **instrumentation** is just an additional component of the states of an analysis that
propagate the required information to the points where dynamic allocation is needed.
This partitions the state space of the store into different contexts, which can allow for more precise analysis.
At the same time these timestamps passively partition the state space of the analysis into different contexts, which correspond to those
store partitions, so that each store partition can affect only the components of the analysis that depend on it. With per-state stores,
that passive partitioning accomplishes mostly the same thing as the partitioning of the store in a widened store.

Use of timestamps can allow for many different allocation strategies, one of which is context-sensitivity. 
Context-sensitive analyses partition the state space of the analysis into different contexts based on the calling context of the function.
This allows the same function being called from different places to produce distinct sets of results.

Contours are a way of tracking context sensitivity as represented by a k-length sequence of function labels (a call-site history).
We could characterize $m$-CFA's allocation strategy [@might_resolving_2010] as being a particular choice of contours (they even admit they use contours but rename them to time - and alias them with environments).
But given the other differences of $m$-CFA's allocation strategy from $k$-CFA, it is probably a bit safer to refer to $m$-CFA environments / timestamps
as being a particular choice of timestamps that give rise to a context-sensitive analysis.

## Other timestamps in CFA

Another related notion of timestamps has to deal with the idea of **timestamping** a global store. This is a separate concept that is used to
not lug around stores around the program. Instead a timestamp is used to represent the incremental updates to a store. When a
value is joined into the store and causes the store to change, then the timestamp is updated to reflect the change. The fixpoint
algorithm then uses the timestamp to determine if a particular state in the state space needs to be re-evaluated with the newest store.
Only when no all states don't change the store is the fixpoint reached. While this is a useful technique for reducing the size of the state space,
it is also a very broad dependency tracking algorithm. More fine-grained dependency tracking can be done by keeping track of which entries in the store
a particular state transition depends on, and only re-evaluating the state transitions that depend on the changed store entries. 
While this sort of fixpoint is particularly well suited for declarative languages, 
a particularly nice formulation of this idea is via the fixpoint monad from Fixing Nondeterminism [@vandenbroucke_fixing_2015],
which we have refined and extended for use in the context of control flow analysis.

There are also other granularities in which to iterate the fixpoint of an analysis.
In particular the paper *Combinator-Based Fixpoint Algorithms for Big-Step Abstract Interpreters* [@keidel_combinator-based_2023] provides a modular way of
iterating the fixpoint of an analysis in big-step style. 
*Effect driven flow analysis* [@nicolay_effect-driven_2019], keeps track of fine grained dependencies between states and only re-evaluates the states that depend on the changed store entries.
It partitions the state space differently for intra-procedural and inter-procedural analysis, with a slightly different fixpoint iteration strategy for each. (*Note it's been awhile since I read this, and I should probably re-read it to make sure I'm not misrepresenting it*). 
Additionally *Abstracting Definitional Interpreters* [@darais_abstracting_2017] provides a broad dependency tracking algorithm for big-step analyses. It is easy to understand and implement compared to the more fine-grained dependency tracking algorithms discussed previously, but it is the first one for abstract definitional interpreters.
