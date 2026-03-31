import axios from 'axios';

export const callMLServer = async (text: string) => {
    try {
        const response = await axios.post('http://localhost:8000/predict', {
            text: text
        });

        return response.data;
    } catch (error) {
        throw new Error("ML Server Unreachable");
    }
};