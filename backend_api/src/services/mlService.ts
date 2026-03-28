import axios from 'axios';

export const callMLServer = async (text: string) => {
    try {
        // Must match the ChatRequest schema in main.py
        const response = await axios.post('http://localhost:8000/predict', {
            text: text
        });

        return response.data; // Returns { emotion: "...", response: "..." }
    } catch (error) {
        throw new Error("ML Server Unreachable");
    }
};