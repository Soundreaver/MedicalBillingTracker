import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { authService } from './auth';
import http from 'http';

(async () => {
  const app = express();

  // CORS configuration
  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Register API Routes
  const server = http.createServer(app);
  await registerRoutes(app);

  // Seed the database with default users if necessary
  if (process.env.NODE_ENV === 'development') {
    await authService.seedUsers();
  }

  // Error Handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // Start Server
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  
  server.listen(port, host, () => {
    console.log(`✅ Server running on http://${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})();
