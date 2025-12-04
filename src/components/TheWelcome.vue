<script setup>
import WelcomeItem from './WelcomeItem.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import SupportIcon from './icons/IconSupport.vue'

const openReadmeInEditor = () => fetch('/__open-in-editor?file=README.md')
</script>

<template>
  <WelcomeItem>
    <template #icon>
      <DocumentationIcon />
    </template>
    <template #heading>{{ $gettext('Traces & Vols') }}</template>

    {{ $gettext('Gérez et analysez tous vos vols. Accédez à votre carnet de vols, importez de nouvelles traces ou examinez des fichiers externes.') }}
    <br />
    {{ $gettext('Bravo pour la traduction') }}
    
    <ul>
      <li><router-link :to="{ name: 'logbook-view' }">{{ $gettext('Logbook') }}</router-link></li>
      <li><router-link :to="{ name: 'import-gps' }">{{ $gettext('Import GPS tracks') }}</router-link></li>
      <li><router-link :to="{ name: 'external-track' }">{{ $gettext('Review an external GPS track') }}</router-link></li>
    </ul>
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
      <ToolingIcon />
    </template>
    <template #heading>{{ $gettext('Tooling') }}</template>

    {{ $gettext('This project is served and bundled with') }}
    <a href="https://vite.dev/guide/features.html" target="_blank" rel="noopener">Vite</a>. The
    {{ $gettext('recommended IDE setup is') }}
    <a href="https://code.visualstudio.com/" target="_blank" rel="noopener">VSCode</a>
    +
    <a href="https://github.com/vuejs/language-tools" target="_blank" rel="noopener"
      >Vue - Official</a
    >. If you need to test your components and web pages, check out
    <a href="https://vitest.dev/" target="_blank" rel="noopener">{{ $gettext('Vitest') }}</a>
    and
    <a href="https://www.cypress.io/" target="_blank" rel="noopener">{{ $gettext('Cypress') }}</a>
    /
    <a href="https://playwright.dev/" target="_blank" rel="noopener">{{ $gettext('Playwright') }}</a>.

    <br />

    {{ $gettext('More instructions are available in') }}
    <a href="javascript:void(0)" @click="openReadmeInEditor"><code>README.md</code></a
    >.
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
      <EcosystemIcon />
    </template>
    <template #heading>{{ $gettext('Ecosystem') }}</template>

    {{ $gettext('Get official tools and libraries for your project:') }}
    <a href="https://pinia.vuejs.org/" target="_blank" rel="noopener">Pinia</a>,
    <a href="https://router.vuejs.org/" target="_blank" rel="noopener">Vue Router</a>,
    <a href="https://test-utils.vuejs.org/" target="_blank" rel="noopener">Vue Test Utils</a>, and
    <a href="https://github.com/vuejs/devtools" target="_blank" rel="noopener">Vue Dev Tools</a>. If
    you need more resources, we suggest paying
    <a href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">Awesome Vue</a>
    a visit.
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
      <CommunityIcon />
    </template>
    <template #heading>{{ $gettext('Community') }}</template>

    {{ $gettext('Got stuck? Ask your question on') }}
    <a href="https://chat.vuejs.org" target="_blank" rel="noopener">Vue Land</a>
    (our official Discord server), or
    <a href="https://stackoverflow.com/questions/tagged/vue.js" target="_blank" rel="noopener"
      >{{ $gettext('StackOverflow') }}</a
    >. {{ $gettext('You should also follow the official') }}
    <a href="https://bsky.app/profile/vuejs.org" target="_blank" rel="noopener">@vuejs.org</a>
    {{ $gettext('Bluesky account or the') }}
    <a href="https://x.com/vuejs" target="_blank" rel="noopener">@vuejs</a>
    {{ $gettext('X account for latest news in the Vue world.') }}
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
      <SupportIcon />
    </template>
    <template #heading>{{ $gettext('Support Vue') }}</template>

    {{ $gettext('As an independent project, Vue relies on community backing for its sustainability. You can help') }}
    us by
    <a href="https://vuejs.org/sponsor/" target="_blank" rel="noopener">{{ $gettext('becoming a sponsor') }}</a>.
  </WelcomeItem>
</template>
