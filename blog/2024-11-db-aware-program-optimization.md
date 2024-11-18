---
slug: db-aware-program-optimization
title: Paper - Database-Aware Program Optimization via Static Analysis
date: 2024-11-18T12:00
authors:
    - koby
tags: [paper, optimization, database, api coalescing]
---

A lot of developer work on database applications goes into making sure the interaction between the application layer and the database layer is efficient. In my experience in industry, this work is mostly done manually, and in an ad-hoc fashion. [@ramachandra2014database] give an account about some ways this can be done manually.

<!--truncate-->

There are two major methods they talk about in the paper. They are as follows:
1. Set-oriented query execution: this technique gathers multiple queries together (they specifically reference queries made in a loop) and combines them into a single query whose results can be broken up and used as if they were single queries. Their technique relies on a program transformation which breaks the loop into two loops, one of which adds the individual queries to the batch, and one which consumes the results of that batch.
2. Asynchronous Prefetching: this technique tries to move queries as early as possible in the program, so that you can overlap the network latency and computation at the database layer with the computation on the application layer. Optionally, you can batch these queries using technique 1. They also discuss ways to do prefetching in more complicated scenarios, such as when the query is made inside nested procedures.

## Koby's thoughts

This paper identifies precisely the problem that I've been thinking about, which is how to optimize programs when you know things both about the program and the database schema. More generally, if you have some way to combine api calls that can reduce overhead of some kind, can we find an automated way to do so? However, the paper relies on two broad techniques to solve this: program transformations and (database-aware) compiler optimizations, both of which I see problems with.

While, generally speaking, program transformations may be alright, I feel that those presented in the paper, such as the loop fission technique that is at the core of almost everything they discuss, are very invasive. They would end up producing code that is difficult to read and maintain (especially if multiple devs implement separate loop fissions, leading to nested loops). The authors themselves point out that this is especially a problem when dealing with queries made in nested procedures. (On the topic of nested procedures, they don't describe the full technique, but instead refer to an earlier paper, which I am curious to read).

Compiler optimizations are also risky because they make implicit a very important aspect of the program, the algorithms that determine its speed. If these techniques are not universally (or nearly universally) applicable, it would be easy for an inexperienced developer to make a change that causes a serious performance regression without ever realizing. Why am I worried about this and not other compiler optimizations? My ideas are not fully formed on this yet, but I think one aspect is just how important things like network latency are to the performance of an application.

So an ideal technique for me would be one that leaves the code mostly intact as the developer wrote it (which, hopefully, would mean it would be more readable and maintainable), but which also has an explicit reference at some point to how the optimization is taking place. It would also be very difficult to accidentally cause a serious performance regression in the technique, or at least there would be a way to warn the developer if they have.

A few thoughts about where to go from here:
1. CFA seems like a promising technique to help with the nested procedure problem, but I'd like to read more about their solution first.
2. Algebraic effects could provide a really solid way to provide for batching while still leaving a trace in the code that isn't too intrusive. However, I can't think of how you could do prefetching using algebraic effects.
3. The paper mentions that their techniques could potentially be broadened to other domains where significant overhead exists besides databases. It could be interesting to explore a technique that could generalize to all of these.
