import { InputComponent } from "../../../modules/ui/components/input/index.js";

console.info('[UIHandlers] Importing InputComponent module', InputComponent);
const chatGPTInput = InputComponent.forChatGPT();
console.info('[UIHandlers] InputComponent instance created');

export function handleEmojiSelected(event) {
  try {
    console.info('[UIHandlers] handleEmojiSelected fired', event);
    const emoji = event?.emoji;
    if (!emoji) {
      console.warn('[UIHandlers] No emoji provided');
      return;
    }

    chatGPTInput.focus();
    chatGPTInput.addText(emoji);
    console.info('[UIHandlers] Emoji inserted');
  } catch (error) {
    console.error('[UIHandlers] Failed to insert emoji', error);
  }
}
