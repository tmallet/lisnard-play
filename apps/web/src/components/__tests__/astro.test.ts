import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import { INDEPENDENCE_NOTICE } from '@/config/app';

import Filters from '../Filters.astro';
import Footer from '../Footer.astro';
import IndependenceNote from '../IndependenceNote.astro';
import Seo from '../Seo.astro';
import Title from '../Title.astro';

const container = await AstroContainer.create();

test('SEO : titre du site, description, canonique, Open Graph et Twitter échappés', async () => {
  const html = await container.renderToString(Seo, {
    props: {
      title: 'Il dit "non" & <oui>',
      description: 'Une description',
      canonical: 'https://play.test/interventions/a',
      ogType: 'video.other',
      image: { url: 'https://play.test/i.png', width: 1200, height: 630, alt: 'Image' },
      twitterCard: 'summary_large_image',
      structuredData: { name: '</script><x>' },
    },
  });
  expect(html).toContain('<title>Il dit &quot;non&quot; &amp; &lt;oui&gt; · Lisnard Play</title>');
  expect(html).toContain('<link rel="canonical" href="https://play.test/interventions/a">');
  expect(html).toContain('<meta property="og:type" content="video.other">');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  expect(html).toContain('<meta property="og:image:width" content="1200">');
  expect(html).not.toContain('</script><x>');
  expect(html).toContain('\\u003c/script\\u003e');
});

test('SEO par défaut : nom seul, description du site, type « website », pas d’image', async () => {
  const html = await container.renderToString(Seo, { props: {} });
  expect(html).toContain('<title>Lisnard Play</title>');
  expect(html).toContain('<meta property="og:type" content="website">');
  expect(html).not.toContain('twitter:card');
  expect(html).not.toContain('canonical');
});

test('titre : un seul mot mis en évidence, en chamois', async () => {
  const html = await container.renderToString(Title, {
    props: { text: 'La campagne en chiffres', highlight: 'campagne' },
  });
  expect(html).toMatch(
    /<h1[^>]*>\s*La <span class="text-chamois">campagne<\/span> en chiffres\s*<\/h1>/,
  );
});

test('mention d’indépendance et mentions légales : en tête et en pied de page', async () => {
  for (const component of [IndependenceNote, Footer]) {
    const html = await container.renderToString(component);
    expect(html).toContain(INDEPENDENCE_NOTICE);
    expect(html).toContain('href="/mentions-legales"');
  }
});

test('filtres : liens qui gardent l’autre filtre, option active signalée, repli sans JavaScript', async () => {
  const html = await container.renderToString(Filters, {
    props: { filters: { theme: 'security', format: 'clip' } },
  });
  expect(html).toContain('href="/?theme=economy&amp;format=clip"');
  expect(html).toContain('href="/?theme=security"');
  expect(html).toMatch(/href="\/\?theme=security&amp;format=clip" aria-current="true"/);
  expect(html).toContain('Filtres · 2 actifs');
  // Bouton visible seulement avec JavaScript, panneau replié seulement avec JavaScript.
  expect(html).toMatch(/class="hidden [^"]*js:max-md:flex/);
  expect(html).toMatch(/id="filtres" class="[^"]*js:max-md:hidden/);
});
