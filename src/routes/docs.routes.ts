import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Load and parse the OpenAPI specification
let swaggerDocument: Record<string, unknown>;

try {
  const openapiPath = join(projectRoot, 'openapi.yaml');
  const openapiContent = readFileSync(openapiPath, 'utf8');
  swaggerDocument = parse(openapiContent) as Record<string, unknown>;
} catch (error) {
  console.error('Failed to load OpenAPI specification:', error);
  swaggerDocument = {
    openapi: '3.1.0',
    info: {
      title: 'AutoMade API',
      version: '1.0.0',
      description: 'OpenAPI specification not found',
    },
    paths: {},
  };
}

// Swagger UI options
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  customSiteTitle: 'AutoMade API Documentation',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-top: 20px }
    .swagger-ui .info .title { font-size: 2rem }
  `,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    persistAuthorization: true,
  },
};

// Serve Swagger UI at /api/docs
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Raw OpenAPI spec endpoint
router.get('/openapi.json', (_req, res) => {
  res.json(swaggerDocument);
});

router.get('/openapi.yaml', (_req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  const openapiPath = join(projectRoot, 'openapi.yaml');
  try {
    const openapiContent = readFileSync(openapiPath, 'utf8');
    res.send(openapiContent);
  } catch {
    res.status(404).json({ code: 'NOT_FOUND', message: 'OpenAPI specification not found' });
  }
});

export default router;
