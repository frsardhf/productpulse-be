import { SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerCustomOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customSiteTitle: 'ProductPulse API Documentation',
  customfavIcon: '/api/favicon-32x32.png',
  customJs: [
    '/api/swagger-ui-bundle.js',
    '/api/swagger-ui-standalone-preset.js',
  ],
  customCssUrl: '/api/swagger-ui.css',
};