// src/utils/crisisDetection.ts

export const isCrisisMessage = (text: string): boolean => {
    const lowerText = text.toLowerCase();

    // English high-risk keywords
    const englishKeywords = [
        'suicide', 'kill myself', 'end my life', 'self harm',
        'cutting', 'want to die', 'end it all', 'hanging'
    ];

    // Sinhala high-risk keywords (Commonly used phrases for distress)
    const sinhalaKeywords = [
        'මැරෙන්න', // marenna (die)
        'මරන්න',   // maranna (kill)
        'ජීවිතේ එපා', // jiwithe epa (tired of life)
        'දිවි නසා', // diwi nasa (suicide)
        'ජීවත් වෙලා වැඩක් නැහැ' // jiwath wela wadak naha (no point living)
    ];

    // Check if any keyword exists in the text
    const hasEnglishCrisis = englishKeywords.some(keyword => lowerText.includes(keyword));
    const hasSinhalaCrisis = sinhalaKeywords.some(keyword => lowerText.includes(keyword));

    return hasEnglishCrisis || hasSinhalaCrisis;
};