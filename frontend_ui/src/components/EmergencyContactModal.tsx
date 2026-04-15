import React from 'react';
import { translations } from '../utils/translations';
import { getEmoji } from '../utils/emoji';

interface EmergencyContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    lang: 'en' | 'si';
}

const EmergencyContactModal: React.FC<EmergencyContactModalProps> = ({ isOpen, onClose, lang }) => {
    if (!isOpen) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const t = translations[lang];

    return (
        <div className="sos-overlay">
            <div className="sos-modal">
                <div className="sos-header">
                    <span className="warning-icon">{getEmoji('warning')}</span>
                    <h2>{lang === 'si' ? 'හදිසි උපකාර අවශ්‍යද?' : 'Need Immediate Support?'}</h2>
                </div>

                <p className="sos-description">
                    {lang === 'si'
                        ? 'ඔබ දැඩි පීඩනයකින් හෝ අවදානමක සිටී නම්, කරුණාකර වහාම මෙම සේවාවන් අමතන්න. ඔබ තනිවම නොවේ.'
                        : 'It sounds like you are going through a very difficult time. Please reach out to a trusted person or contact these professional services immediately.'}
                </p>

                <div className="sos-action-list">
                    {/* National Mental Health Helpline */}
                    <div className="sos-card">
                        <div className="sos-info">
                            <strong>1926 - National Helpline</strong>
                            <span>National Institute of Mental Health</span>
                        </div>
                        <a href="tel:1926" className="sos-call-btn">{getEmoji('telephone_receiver')} Call 1926</a>
                    </div>

                    {/* Sumithrayo */}
                    <div className="sos-card">
                        <div className="sos-info">
                            <strong>Sumithrayo</strong>
                            <span>Crisis Support & Suicide Prevention</span>
                        </div>
                        <a href="tel:0112696666" className="sos-call-btn">{getEmoji('telephone_receiver')} Call Now</a>
                    </div>
                </div>

                <button className="sos-close-btn" onClick={onClose}>
                    {lang === 'si' ? 'සංවාදයට නැවත යන්න' : 'Return to Chat'}
                </button>
            </div>
        </div>
    );
};

export default EmergencyContactModal;