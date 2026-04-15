import { get } from 'node-emoji';

/**
 * Explicit fallbacks for emojis not covered by node-emoji's dataset
 * (religious symbols, newer Unicode emoji added after emojilib's freeze, etc.)
 */
const EMOJI_FALLBACKS: Record<string, string> = {
    person_in_lotus_position: '\u{1F9D8}',
    dharma_wheel: '\u{2638}\uFE0F',
    star_and_crescent: '\u{262A}\uFE0F',
    latin_cross: '\u{271D}\uFE0F',
    medical_symbol: '\u{2695}\uFE0F',
    lotus: '\u{1FAB7}',
};

/**
 * Returns the emoji character for the given node-emoji name.
 * Falls back to EMOJI_FALLBACKS for emojis outside the node-emoji dataset,
 * and to an empty string if the name is unknown entirely.
 */
export function getEmoji(name: string): string {
    return get(name) ?? EMOJI_FALLBACKS[name] ?? '';
}
