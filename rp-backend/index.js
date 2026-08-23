import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { FRONTEND_ORIGIN, PORT } from './lib/config.js';
import { log } from './lib/log.js';
import loginRouter from './routes/login.js';
import callbackRouter from './routes/callback.js';
import meRouter from './routes/me.js';
import logoutRouter from './routes/logout.js';

const app = express();
app.use(cookieParser());
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

app.use((req, _res, next) => {
  log('RP-backend', `${req.method} ${req.path}`);
  next();
});

app.use(loginRouter);
app.use(callbackRouter);
app.use(meRouter);
app.use(logoutRouter);

app.listen(PORT, () => {
  log('RP-backend', `listening on http://localhost:${PORT}`);
});
