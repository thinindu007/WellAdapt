// src/utils/crisisDetection.ts

export const isCrisisMessage = (text: string): boolean => {
    const lowerText = text.toLowerCase();

    // English high-risk keywords
    const englishKeywords = [
        'suicide', 'kill myself', 'end my life', 'self harm',
        'cutting', 'want to die', 'end it all', 'hanging'
    ];

    // Sinhala high-risk keywords
    const sinhalaKeywords = [
        'මැරෙන්න',
        'මරන්න',
        'ජීවිතේ එපා',
        'දිවි නසා',
        'ජීවත් වෙලා වැඩක් නැහැ'
    ];

    // Check keyword in the text
    const hasEnglishCrisis = englishKeywords.some(keyword => lowerText.includes(keyword));
    const hasSinhalaCrisis = sinhalaKeywords.some(keyword => lowerText.includes(keyword));

    return hasEnglishCrisis || hasSinhalaCrisis;
};