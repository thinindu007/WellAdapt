import axios from 'axios';

const API_URL = 'http://localhost:5000/api/chat';

export const sendMessage = async (text: string) => {
    const token = localStorage.getItem('token');

    try {
        const response = await axios.post(API_URL,
            { text: text },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Chat API Error:", error);
        throw error;
    }
};