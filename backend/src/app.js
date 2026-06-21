const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { CORS_ORIGIN } = require('./config/constants');
const logger = require('./utils/logger');

const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const apiRoutes = require('./routes');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling']
});

app.set('io', io);
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

// Rate limiting - Genel API limiti
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Bu IP adresinden çok fazla istek geldi, lütfen daha sonra tekrar deneyin.'
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info('Client connected', socket.id);
  socket.emit('connected', { message: 'Connected to real-time price stream', timestamp: new Date().toISOString() });
  socket.on('disconnect', () => logger.info('Client disconnected', socket.id));
  socket.on('subscribe-symbols', (symbols) => {
    logger.debug('Client subscribed to symbols', socket.id, symbols);
    socket.emit('subscription-confirmed', { symbols });
  });
});

module.exports = { app, httpServer, io };

