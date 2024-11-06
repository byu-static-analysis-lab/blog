// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

module.exports = async function createConfigAsync() {
  const katex = await import('rehype-katex')
  const math = await import('remark-math')
  const renderer = await import('prism-react-renderer');

  const lightCodeTheme = renderer.themes.github;
  const darkCodeTheme = renderer.themes.palenight;

  return {
    title: 'BYU Static Analysis Lab',
    tagline: '',
    favicon: 'img/byu-pl-logo.png',
    deploymentBranch: "gh-pages",
    trailingSlash: false,
    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'byu-static-analysis-lab',
    projectName: 'blog',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/blog',

    // Set the production url of your site here
    url: 'https://byu-static-analysis-lab.github.io',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
      defaultLocale: 'en',
      locales: ['en'],
    },
    stylesheets: [
      {
        href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
        type: 'text/css',
        integrity:
          'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
        crossorigin: 'anonymous',
      },
    ],
    presets: [
      [
        'classic',
        /** @type {import('@docusaurus/preset-classic').Options} */
        ({
          docs: {
            sidebarPath: require.resolve('./sidebars.js'),
            // Please change this to your repo.
            // Remove this to remove the "edit this page" links.
            editUrl:
              'https://github.com/byu-static-analysis-lab/blog/tree/main/',
            routeBasePath: 'docs',
            remarkPlugins: [math.default],
            rehypePlugins: [katex.default],
          },
          blog: {
            showReadingTime: true,
            blogSidebarCount: 'ALL',
            blogSidebarTitle: 'All posts',
            routeBasePath: '/',
            // Please change this to your repo.
            // Remove this to remove the "edit this page" links.
            editUrl:
              'https://github.com/byu-static-analysis-lab/blog/tree/main/',
            remarkPlugins: [math.default],
            rehypePlugins: [katex.default],
          },
          theme: {
            customCss: require.resolve('./src/css/custom.css'),
          },
        }),
      ],
    ],

    themeConfig:
      /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
      ({

        // Replace with your project's social card
        // image: 'img/docusaurus-social-card.jpg',
        navbar: {
          title: 'BYU Static Analysis Lab',
          logo: {
            alt: 'Lab Logo',
            src: 'img/byu-pl-logo.png',
          },
          items: [
            {
              type: 'docSidebar',
              sidebarId: 'projectSidebar',
              position: 'left',
              label: 'Projects',
            },
            { to: '/', label: 'Blog', position: 'left' },
            {
              href: 'https://github.com/byu-static-analysis-lab/blog/tree/main/',
              label: 'GitHub',
              position: 'right',
            },
          ],
        },
        footer: {
          style: 'dark',
          links: [
            {
              title: 'Docs',
              items: [
                {
                  label: 'Projects',
                  to: '/docs/intro',
                },
              ],
            },
            {
              title: 'More',
              items: [
                {
                  label: 'Blog',
                  to: '/',
                },
                {
                  label: 'GitHub',
                  href: 'https://github.com/byu-static-analysis-lab/blog',
                },
              ],
            },
          ],
          copyright: `Copyright © ${new Date().getFullYear()} BYU Static Analysis. Built with Docusaurus.`,
        },
        prism: {
          theme: lightCodeTheme,
          darkTheme: darkCodeTheme,
        },
        colorMode: {
          defaultMode: 'dark',
          disableSwitch: true,
          respectPrefersColorScheme: true,
        }
      }),
  }
};

