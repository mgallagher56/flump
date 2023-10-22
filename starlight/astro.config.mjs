import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://github.com/mgallagher56.github.io',
  base: '/flump',
  integrations: [
    starlight({
      title: 'Flump Docs',
      social: {
        github: 'https://github.com/mgallagher56/flump'
      },
      sidebar: [
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            {
              label: 'Example Guide',
              link: '/guides/example/'
            }
          ]
        },
        {
          label: 'Reference',
          autogenerate: {
            directory: 'reference'
          }
        }
      ]
    }),
    react()
  ]
});
