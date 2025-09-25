const express = require('express');
const cors = require('cors');
const walletRoutes = require('./routes/wallet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/wallet', walletRoutes);

// Swagger setup (added for documentation)
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wallet Middleware Service API',
      version: '1.0.0',
      description: 'API for generating cryptocurrency wallets',
    },
    servers: [
      {
        url: `https://espays-nodejs-microservice.onrender.com`,
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to files with JSDoc comments
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// End of Swagger setup

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Wallet Middleware Service running at http://localhost:${PORT}`);
  console.log(`📖 API Docs available at http://localhost:${PORT}/api-docs`);
});