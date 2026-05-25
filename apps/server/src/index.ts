import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createContext } from './trpc';
import { appRouter } from './router';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Prevent unhandled promise rejections from crashing the server (crucial for Puppeteer/WhatsApp)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());

// Support JSON payloads up to 10MB (for base64 images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploaded assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Local file upload endpoint (base64)
app.post('/upload', (req: any, res: any) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }
  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const extension = image.match(/^data:image\/(\w+);base64,/)?. [1] || 'png';
    const filename = `upload_${Date.now()}.${extension}`;
    const uploadDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(uploadDir, filename), base64Data, 'base64');
    return res.json({ url: `${req.protocol}://${req.get('host')}/uploads/${filename}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 DEVITE Server running on http://0.0.0.0:${PORT}/trpc`);
  console.log(`🔌 Socket.io ready on ws://127.0.0.1:${PORT}`);
});

export { io };
// Trigger server build
