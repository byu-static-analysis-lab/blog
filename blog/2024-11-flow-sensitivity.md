---
slug: flow-sensitivity
title: Topic - Flow Sensitivity
data: 2024-11-07T12:00
authors:
  - koby
tags: [static-analysis, flow-analysis, abstract-interpretation]
---

There are (at least) three different "sensitivities" an [abstract analysis](./2024-11-abstract-interpretation.md) can have:
- flow insensitive
- flow sensitive
- path sensitive

This article briefly describes the difference between them.

<!--truncate-->

One form of abstract analysis is a type check.

Consider this typescript program:
```ts
function myFunc(x : string | number) {
  let y;
  if (x === 0) {
    y = 0; // a
  } else {
    y = "some string"; // b
  }

  if (x === 0) {
    console.log(y); // c
  } else {
    console.log(y + y); // d
  }
}
```

What is the type of `x` at point `a` in the program? Many type checkers would simply report `string | number`, but TypeScript's type checker is smart enough to know that it is `number` here, based on the check `x === 0`, which can only be true if `x` is a number. This is because TypeScript's type checker is *flow sensitive*, while many other type checkers are *flow insensitive*.

Now, what is the type of `y` at point `c` in the program? We can inspect it and know that if we got to point `c`, then `x === 0` is true, and earlier we must have gone through point `a`. This means that `y` must be `number`, since it was assigned `0`. However, TypeScript still just reports `number | string`. This is because, TypeScript's type checker is *not* path-sensitive. Our analysis that we did manually *was* path-sensitive.

So, in order of specificity, we have path-insensitive < path-sensitive < flow-sensitive. Path-insensitive analyses collect facts that are true at any point in the program. It is always true to say that `x : string | number` and `y : string | number`. Path-sensitive analyses associate facts with particular points in the program, but do not distinguish how you got there. At point `c` in the program, it is always true to say that `x : number` and `y : string | number` (we can't say anything more specific about `y` because we don't know if we went through point `a` or `b`). Flow-sensitivity associates facts with points in the program *and how you got there*, or "flows". It is always true to say that at point `c`, given you went through point `a`, that `x : number` and `y : number`, and there are no flows that reach point `c` except those that also previously reach `a`.
