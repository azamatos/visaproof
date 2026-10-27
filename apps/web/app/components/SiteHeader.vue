<script setup lang="ts">
const route = useRoute();
const NAV = [
  { to: "/", label: "Search", phone: false },
  { to: "/method", label: "Method", phone: true },
  { to: "/status", label: "Status", phone: false },
];
const current = (to: string) => (to === "/" ? route.path === "/" : route.path.startsWith(to));
// The channel opens in Telegram: the app on a phone, Telegram Desktop or the channel's web page on a computer
const telegram = useRuntimeConfig().public.telegramUrl;
</script>

<template>
  <header class="border-b border-line bg-bg">
    <div class="mx-auto flex h-14 max-w-[1264px] items-center justify-between gap-3 px-4 md:h-16 md:px-8">
      <NuxtLink
        to="/"
        aria-label="visaproof.azamatos, search"
        class="inline-flex min-h-11 items-center text-[13px] no-underline md:text-[15px]"
      >
        <Wordmark />
      </NuxtLink>
      <nav aria-label="Site">
        <ul class="flex items-center gap-1">
          <li v-for="n in NAV" :key="n.to" :class="n.phone ? '' : 'hidden md:block'">
            <NuxtLink
              :to="n.to"
              :aria-current="current(n.to) ? 'page' : undefined"
              class="inline-flex min-h-11 items-center px-2 text-sm underline-offset-[6px] md:px-3"
              :class="
                current(n.to) ? 'text-fg underline decoration-1' : 'text-fg-2 no-underline hover:text-fg'
              "
            >
              {{ n.label }}
            </NuxtLink>
          </li>
          <!-- The Telegram channel: the nav's only accent. Desktop: a bell and the word after a divider; phone: the bell -->
          <li class="hidden items-center md:flex">
            <span aria-hidden="true" class="mx-2 h-4 w-px bg-line" />
            <a
              :href="telegram"
              target="_blank"
              rel="noopener"
              class="inline-flex min-h-11 items-center gap-2 px-3 text-sm text-fg-2 no-underline hover:text-fg"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                class="stroke-accent"
              >
                <path d="M4 6.5a4 4 0 0 1 8 0c0 3.5 1.5 4.5 1.5 4.5h-11S4 10 4 6.5z" />
                <path d="M6.75 13.5a1.4 1.4 0 0 0 2.5 0" />
              </svg>
              Telegram<span class="sr-only"> channel, opens Telegram</span>
            </a>
          </li>
          <li class="md:hidden">
            <a
              :href="telegram"
              target="_blank"
              rel="noopener"
              aria-label="Telegram channel, opens Telegram"
              class="grid size-11 place-items-center rounded-[10px] text-accent"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M4 6.5a4 4 0 0 1 8 0c0 3.5 1.5 4.5 1.5 4.5h-11S4 10 4 6.5z" />
                <path d="M6.75 13.5a1.4 1.4 0 0 0 2.5 0" />
              </svg>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>
