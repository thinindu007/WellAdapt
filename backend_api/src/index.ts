import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chatRoutes';
import authRoutes from './routes/authRoutes';
import pool from './config/db';
import studyPlanRoutes from './routes/studyPlanRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Check DB Connection
pool.connect()
    .then(() => console.log(" Connected to PostgreSQL"))
    .catch(err => console.error("Database connection error", err));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/study-plan', studyPlanRoutes);

app.listen(PORT, () => {
    console.log(` WellAdapt Backend running on http://localhost:${PORT}`);
});