<script setup lang="ts">
// "Report a wrong answer": which answer, and what the posting says. The site stores nothing (it only reads the
// database), so the report becomes an email in the visitor's own mail app, to the corrections address. A sheet
// from the bottom on a phone, a dialog in the middle on a desktop.
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupRoot,
} from "reka-ui";

const open = defineModel<boolean>("open", { required: true });
const { job, shown } = defineProps<{
  job: { id: number; title: string; company: string; url: string };
  shown: { key: string; label: string; value: string }[];
}>();

const address = useRuntimeConfig().public.correctionsEmail;
const origin = useRequestURL().origin;
const which = ref(shown[0]?.key ?? "other");
const text = ref("");

const mailto = computed(() => {
  const answer = shown.find((s) => s.key === which.value);
  const subject = `Wrong answer: ${answer?.label ?? "something else"} · ${job.title} at ${job.company}`;
  const body = [
    `Role: ${origin}/jobs/${String(job.id)}`,
    `Posting: ${job.url}`,
    `Which answer: ${answer ? `${answer.label} (the site says: ${answer.value})` : "something else"}`,
    "",
    text.value.trim() || "(what the posting says)",
  ].join("\n");
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/70" />
      <DialogContent
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col gap-[18px] overflow-y-auto rounded-t-2xl border-t border-line bg-bg px-4 pt-5 pb-4 text-fg md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card md:border md:p-6"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-1">
            <DialogTitle class="text-xl font-medium">Report a wrong answer</DialogTitle>
            <DialogDescription class="text-sm text-fg-2"
              >{{ job.title }} · {{ job.company }}</DialogDescription
            >
          </div>
          <DialogClose
            aria-label="Close"
            class="-mt-1.5 -mr-2 grid size-11 flex-none cursor-pointer place-items-center rounded-control"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </DialogClose>
        </div>
        <div class="flex flex-col gap-[18px]">
          <fieldset class="m-0 flex flex-col border-0 p-0">
            <legend class="pb-1.5 text-[15px] font-medium">Which answer is wrong?</legend>
            <RadioGroupRoot v-model="which" class="flex flex-col">
              <label
                v-for="s in [...shown, { key: 'other', label: 'Something else', value: '' }]"
                :key="s.key"
                class="flex min-h-[46px] cursor-pointer items-center gap-3 border-b border-line"
              >
                <RadioGroupItem
                  :value="s.key"
                  class="grid size-[22px] flex-none cursor-pointer place-items-center rounded-full border-[1.5px] border-line-strong data-[state=checked]:border-accent"
                >
                  <RadioGroupIndicator class="size-2.5 rounded-full bg-accent" />
                </RadioGroupItem>
                <span class="flex-1 text-[15px]">{{ s.label }}</span>
                <span class="text-xs text-fg-2">{{ s.value }}</span>
              </label>
            </RadioGroupRoot>
          </fieldset>
          <div class="flex flex-col gap-1.5">
            <label for="report-text" class="text-[15px] font-medium"
              >What does the posting say? <span class="font-normal text-fg-2">Optional</span></label
            >
            <textarea
              id="report-text"
              v-model="text"
              rows="3"
              placeholder="Paste the sentence, or tell us what's wrong"
              class="w-full resize-y rounded-control border border-line-strong bg-surface px-3.5 py-3 text-base text-fg placeholder:text-fg-2"
            />
          </div>
          <p class="text-xs text-fg-2">
            This opens your email app with the report filled in, to {{ address }}. We read every report and
            fix the answer if the posting backs it up.
          </p>
          <div class="flex gap-2">
            <DialogClose
              type="button"
              class="h-12 flex-1 cursor-pointer rounded-control border border-line-strong text-[15px]"
            >
              Cancel
            </DialogClose>
            <a
              :href="mailto"
              class="flex h-12 flex-[2] items-center justify-center rounded-control bg-accent text-[15px] font-medium text-accent-ink no-underline"
              @click="open = false"
            >
              Write the email
            </a>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
