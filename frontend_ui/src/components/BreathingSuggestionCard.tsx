import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmoji } from '../utils/emoji';
import './BreathingExercise.css';

interface Props {
    lang: 'en' | 'si';
}

const BreathingSuggestionCard: React.FC<Props> = ({ lang }) => {
    const navigate = useNavigate();

    return (
        <div className="breathing-suggestion-card" onClick={() => navigate('/breathing')}>
            <span className="suggestion-icon">{getEmoji('person_in_lotus_position')}</span>
            <div className="suggestion-text">
                <span className="suggestion-title">
                    {lang === 'si'
                        ? 'ආශ්වාස අභ්‍යාසයක් උත්සාහ කරන්න'
                        : 'Try a Breathing Exercise'}
                </span>
                <span className="suggestion-desc">
                    {lang === 'si'
                        ? 'ඔබට තරමක් මහන්සියක් දැනෙන බව පෙනේ. විනාඩි 2ක හුස්ම ගැනීමේ අභ්‍යාසයක් ඔබට සන්සුන් වීමට උපකාරී වේ.'
                        : 'You seem to be feeling stressed. A 2-minute guided breathing exercise may help you feel calmer.'}
                </span>
            </div>
        </div>
    );
};

export default BreathingSuggestionCard;