---
slug: abstract-interpretation
title: Topic - Abstract Interpretation
date: 2024-11-07T12:00
authors:
  - koby
tags: [static-analysis, abstract-interpretation]
---

Abstract interpretation is a very common technique for analyzing programs. This is a quick primer on the topic.

The core idea of an abstract interpretation is to "run the program", but instead of typical program states/values/etc (sometimes referred to collectively as configurations), we use some replacement that means the execution is decidable (the program always terminates).

<!--truncate-->

Probably the single most common automated analysis is a type check, which is itself a form of abstract analysis. Throughout this primer, we'll use a simply typed lambda calculus, extended with `nat`, `if0`, and `letrec`. Execution will be done via the standard syntax-based transition system with replacement for function application (no environment or store).

In abstract interpretion, the convention is to write the concrete types with their normal notation, and the abstract versions with the normal notation with a hat. In our example, we have the type $Value$, which is the type of the result of running the program, and can either be a value in `nat`, or a closure. We also have type $Type$, which is the result of running the type check. But in the typical abstract interpretation, we would write $\widehat{Value}$. To familiarize us with this notation, I will use the $\widehat{Value}$ notation, but know that it is the same as $Type$.

Now, we have two domains, $Value$ and $\widehat{Value}$, but for our analysis to be useful, we need some way to relate them. Often, the way that we do this is having a couple of functions that translate between the two domains. A common way to notate these is $\alpha$ (stands for "abstract") and $\gamma$ (stands for concretize). In our case, we could have $\alpha : Value \rightarrow \widehat{Value}$ and $\gamma : \widehat{Value} \rightarrow \mathcal{P}(Value)$. Note that $\gamma$'s return type is a powerset, since there are any number of values in a given type.

Once we have one or both of these functions, we can write theorems that relate elements of the two domains. After running the abstract analysis and get a result in the abstract domain, then we can say something about the concrete execution of the program. If we can prove the analysis is sound, then the result of the abstract interpreter tells us something trustworthy about what the concrete analysis will look like.

Take the program
```
((lambda x. if0 x then 1 else 2 end) 0)
```

We can just interpret this program and know that the result will be `1`, which is in $Value$. But in general, because we have `letrec` in our language, just interpretting and finding the result might not terminate, and in any case might take a very long time. A type check would be much faster. If you've taken CS 330 at BYU, you probably noticed that the `typecheck` function looks very similar to the `interp` function. One difference is the types they return (`Value` vs `Type`), but the more important one is that we know `typecheck` will always terminate, and is much faster.

Running a type check on this program produces `nat`, which is in $\widehat{Value}$. While this is not nearly as specific as `1`, it does tell us something! We can use $(\gamma \, nat)$ to return a set of all of the possibilities our program *could* return, based on our analysis. In this case, we know that it could be any natural number, and that it definitely isn't a closure.

## Generalizing

In our type check example, our abstract domain was related to the values returned by our program, but in general, there are all kinds of domains we could be concerned with. For instance, if our language has a store, we could have an abstract store that has only finitely many addresses. The key is that whatever abstraction you use, you can prove that that abstraction makes your interpretation decidable.
