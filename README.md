# Website

This website is built using [Docusaurus 3](https://docusaurus.io/), a modern static website generator.

### Installation

Install npm / yarn. 

### Local Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

```
$ yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.


### Organization

- blog/authors.yml - is a list of the people in our lab with their contact info
- blog/* - are blog posts organized by year/month + name - if updated later, update the date
- docs/intro - contains a short list of the projects going on in the lab
- docs/papers - contains organized lists of interesting papers split by topic and organized by recommended reading order or other topic-specfic criteria: each paper should have a short 1-2 sentence summary of its contribution to the topic


### TODO

- [ ] Abstract Domains / Designing Abstract Domains
- [ ] Context irrelevance
- [ ] Store Widening
- [ ] Fixpoint Iteration Strategies
- [ ] Mixing Flow Context and Path sensitivity
- [ ] Finish AAM 