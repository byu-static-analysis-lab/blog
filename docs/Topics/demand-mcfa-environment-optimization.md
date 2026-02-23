---
sidebar_position: 1
title: Demand m-CFA and the Limiting Environment Optimization
---

Demand $m$-CFA as presented in the paper works well, and is quite fast, but it is still more expensive than needed. 

One idea is to take inspiration from full program analysis and limit the environments to the free variables of the expression when entering a new expression.

The subtlety is that these expressions would then depend on refinements that will never be discovered, or at least not within the right scope.

Take the following example:
```scheme
(λ (x) 
  (λ (y)
    (λ (z)
      (let ([g (+ x y)]
            [h (+ y z)])
        (+ g h)))))
```
The environments are:
```
?x
?x,?y
?x,?y,?z
```

Let's say that the possible combinations of call sites for each variable are as follows:
```
?x: (a), (b), (c)
?x,?y: (a,d), (b,e) // c never calls the returned lambda, each outer only flows to one inner call site
?x,?y,?z: (a,d,n), (b,e,m), (a,d,m) // n can determine the outer ones, m cannot.
```

Obviously there is some reachability information in the instantiated environments. It is *not* however a logic relation between variables --- it is a flow-relational connection between variables.

If while evaluating `x` in `(+ x y)` we naively remove `?y=..,?z=..` from the environment and look at all refinements for `?x`, then we get `(a)`, `(b)`, `(c)`, of which at least `(c)` would be spurious, and possibly the instantiation of `?z` could tell us about the particular binding for `?x` even though `z` is not used in this subexpression. Let's name this problem *lost dependencies*.

The first fix to this issue is to include in the environment the lambda it is relative to. So `?x:(λ (z) ...)` is a different environment than `?x:(λ (x) ...)`. Then instantiation must be adjusted as well to instantiate not only the full environment, but also subportions of (the fully instantiated one). 
This ensures that we adhere to what the paper points out that we cannot instantiate context per context, but environment for environment.

There is a second issue however:
```scheme
(λ (x) 
  (λ (y)
    (λ (z)
      (let ([g (+ x y)] // evaluated in (a,d), (b,e)
            [h (+ y z)]) // evaluated in (d,n) (e,m) (d,m)
        (+ g h))))) // evaluated in (a,d,n), (b,e,m), (a,d,m)
```
As originally implemented, instantiation only happens at lambdas, which makes sense. Let bindings are resolved locally relative to the instantiations that reach the lambda. However, it is not clear how to limit to the free variables of `(+ g h)`. Let's call this issue *missing dependencies*. It seems that the fix is to limit to the free variables of each of the definitions involved. This seems reasonable.


This post introduces an optimizations to Demand $m$-CFA (limiting to free variables of an expression). 
This optimization almost always appears in real implementations of full program CFA. 
It also introduces two issues that the naive implementation of the optimization presents as compared to full program analysis, which I call *lost* and *missing* dependencies. 
Each fix seems reasonable but they are currently unproven.

A related issue with naive $m$-CFA as it is presented in the paper is that only two aspects of flow-sensitivity are considered: one-step call-lambda reachability, and lambda-flow reachability. These aspects are not what are typically considered "flow-sensitivity", and more work is needed to determine what does flow-sensitivity look like in general for Demand $m$-CFA.