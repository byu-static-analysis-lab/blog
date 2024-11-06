"use strict";(self.webpackChunkdev_blog=self.webpackChunkdev_blog||[]).push([[130],{7735:e=>{e.exports=JSON.parse('{"archive":{"blogPosts":[{"id":"abstracting-abstract-machines","metadata":{"permalink":"/blog/abstracting-abstract-machines","editUrl":"https://github.com/byu-static-analysis-lab/blog/tree/main/blog/2024-11-aam.md","source":"@site/blog/2024-11-aam.md","title":"Abstracting Abstract Machines","description":"TODO: Writeups about the paper AAM","date":"2023-11-06T12:00:00.000Z","tags":[{"inline":true,"label":"static-analysis","permalink":"/blog/tags/static-analysis"},{"inline":true,"label":"flow-analysis","permalink":"/blog/tags/flow-analysis"},{"inline":true,"label":"soundness","permalink":"/blog/tags/soundness"},{"inline":true,"label":"completeness","permalink":"/blog/tags/completeness"}],"readingTime":0.03,"hasTruncateMarker":false,"authors":[{"name":"Tim Whiting","title":"Author","url":"https://github.com/TimWhiting","imageURL":"https://github.com/TimWhiting.png","key":"tim","page":null}],"frontMatter":{"slug":"abstracting-abstract-machines","title":"Abstracting Abstract Machines","date":"2023-11-06T12:00","authors":["tim"],"tags":["static-analysis","flow-analysis","soundness","completeness"]},"unlisted":false,"nextItem":{"title":"Control Flow Analysis","permalink":"/blog/control-flow-analysis"}},"content":"TODO: Writeups about the paper AAM"},{"id":"control-flow-analysis","metadata":{"permalink":"/blog/control-flow-analysis","editUrl":"https://github.com/byu-static-analysis-lab/blog/tree/main/blog/2024-11-control-flow-analysis.md","source":"@site/blog/2024-11-control-flow-analysis.md","title":"Control Flow Analysis","description":"This is a Blog for the BYU Static Analysis Lab","date":"2023-11-06T12:00:00.000Z","tags":[{"inline":true,"label":"static-analysis","permalink":"/blog/tags/static-analysis"},{"inline":true,"label":"flow-analysis","permalink":"/blog/tags/flow-analysis"},{"inline":true,"label":"soundness","permalink":"/blog/tags/soundness"},{"inline":true,"label":"completeness","permalink":"/blog/tags/completeness"},{"inline":true,"label":"Demand-CFA","permalink":"/blog/tags/demand-cfa"}],"readingTime":4.47,"hasTruncateMarker":true,"authors":[{"name":"Tim Whiting","title":"Author","url":"https://github.com/TimWhiting","imageURL":"https://github.com/TimWhiting.png","key":"tim","page":null}],"frontMatter":{"slug":"control-flow-analysis","title":"Control Flow Analysis","date":"2023-11-06T12:00","authors":["tim"],"tags":["static-analysis","flow-analysis","soundness","completeness","Demand-CFA"]},"unlisted":false,"prevItem":{"title":"Abstracting Abstract Machines","permalink":"/blog/abstracting-abstract-machines"}},"content":"This is a Blog for the BYU Static Analysis Lab\\n\\nDr. Kimball Germane is our advisor at BYU. https://kimball.germane.net/\\n\\nHe has a lot of experience with static analysis, and especially with making control flow analysis practical for real world use.\\n\\nIn this blog post we will introduce static analysis from a few different perspectives.\\n\\nClick (Read More) below to read the rest of the post.\\n\\n\x3c!--truncate--\x3e\\n\\n## Tim\'s Thoughts on Static Control Flow Analysis \\n**Static analysis** is a way to analyze properties about a program without running it. Some properties of a program are restricted by the type system, but\\noften you want to know a bit more about the program than a type system can tell you. For example, you might want to know if an integer is always positive, or if a function never throws an exception.\\n\\nWhile some of these properties can be determined by a more restrictive type system, there is always a tradeoff when you make a type system more restrictive. The more restrictive a type system is, the more difficult it is to write programs that may be valid, but don\'t fit the type system. On the other hand, some type systems are super expressive allowing the programmer to express rich types where types can depend on values (see [Idris](https://www.idris-lang.org/) for an example). Both by making a type system more restrictive and by making it more expressive, you completely change the developer experience which can make it much easier or much harder to write programs.\\n\\nEven with an expressive type system, there are still properties that are interesting to a compiler that the type system is unlikely to help you with. A common example is inlining. Inlining functions can be very beneficial to runtime performance \u2013 it can save you the overhead of a function call (though the overhead can be minimal depending on the language you use). Additionally, in the case of higher order functions such as closures, it can save you de/allocation of the closure. Another example of a property that is useful, but not typically expressed in type systems are security properties such as ensuring that secrets within a program are not leaked, and that the program doesn\'t accept any input from the user that could compromise the program.\\n\\n**Flow analysis** is one way of solving many static analysis questions. Essentially the common questions that we ask is about what values can flow to which points in the program. Due to infinite loops, and arbitrary run-time input, we cannot just interpret the program while logging all values of each variable. Instead we really want to know all possible ways the program can execute given *any* input or path through the program. This is a very difficult problem, and in general is undecidable. However, there are many cases where we can get a good approximation of the answer, and that is what we are interested in. There are many ways of approximating the solution to this problem, but what we are interested in is a *sound* solution. For the solution to be *sound* it means that we need to consider all possible executions of the program. Because it is an approximation we can either underestimate all possible executions (leaving out some possibilities) or overestimate all possible executions (including some possibilities that are in reality not possible). We are interested in the latter case, because we want to be sure that we are not missing any possible execution paths. If we don\'t consider all possible executions that could mean that our analysis is *unsound*, for example it might say that a value is always positive, when in reality it could be negative. You could imagine that it might be useful to know when something has to happen, in which case you would want a *complete* analysis. A complete analysis guarantees that if it says something happens then it really does. Soundness and completeness are not opposites, but they are both useful properties to think about when discussing formal reasoning systems.\\nFlow analysis starts with a sound analysis and much of the research focuses on how to make the analyses more *precise* (complete).\\n\\nHowever just following where simple values flow \u2013 such as into and out of functions or into branches of a switch or if statement \u2013 is not typically enough. Many languages have first class functions. With first class functions, functions are values that themselves can be passed around the program. This means that the flow of a value can depend on the flow of a function and vice versa. This is what we call **Control Flow Analysis**.\\n\\nControl flow analyses are really expensive, so in practice, they are not often used in compilers. Our aim is to change that. There are theoretic barriers indicating that a full-program flow analysis requires at least $O(n^3)$ time / space. However we believe that there is a lot of room for improvement in the practicality of control flow analyses, by breaking up the full program into parts of interest and doing a local control flow analysis on demand from there. We believe that this approach can solve many of the flow problems that compilers and users would like answered.\\n\\nA great paper by Kimball on the topic is [Demand Control-Flow Analysis](http://kimball.germane.net/germane-2019-dcfa.pdf). It is a great read, especially for understanding the approach we are using for part ofmy PhD research."}]}}')}}]);