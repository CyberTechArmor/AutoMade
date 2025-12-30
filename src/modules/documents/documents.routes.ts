import { Router } from 'express';
import { validate, authenticate, authorize } from '../../middleware/index.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  createVersionSchema,
  listDocumentsSchema,
  getDocumentSchema,
  getVersionSchema,
  addCommentSchema,
  uploadAttachmentSchema,
  deleteAttachmentSchema,
} from './documents.schemas.js';
import * as documentService from './documents.service.js';
import multer from 'multer';

const router = Router({ mergeParams: true });

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * GET /projects/:projectId/documents
 * List all documents for a project
 */
router.get(
  '/',
  authenticate,
  authorize('documents:read'),
  validate(listDocumentsSchema),
  async (req, res, next) => {
    try {
      const result = await documentService.listDocuments({
        projectId: req.params.projectId!,
        type: req.query.type as string | undefined,
        state: req.query.state as string | undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /projects/:projectId/documents/:documentId
 * Get a document with all versions
 */
router.get(
  '/:documentId',
  authenticate,
  authorize('documents:read'),
  validate(getDocumentSchema),
  async (req, res, next) => {
    try {
      const result = await documentService.getDocumentWithVersions(
        req.params.projectId!,
        req.params.documentId!
      );

      if (!result) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /projects/:projectId/documents/:documentId/versions/:version
 * Get a specific document version
 */
router.get(
  '/:documentId/versions/:version',
  authenticate,
  authorize('documents:read'),
  validate(getVersionSchema),
  async (req, res, next) => {
    try {
      const version = await documentService.getDocumentVersion(
        req.params.projectId!,
        req.params.documentId!,
        Number(req.params.version)
      );

      if (!version) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Document version not found',
        });
        return;
      }

      res.json(version);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/documents
 * Create a new document
 */
router.post(
  '/',
  authenticate,
  authorize('documents:create'),
  validate(createDocumentSchema),
  async (req, res, next) => {
    try {
      const document = await documentService.createDocument(
        req.params.projectId!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/documents/:documentId/versions
 * Create a new version of a document
 */
router.post(
  '/:documentId/versions',
  authenticate,
  authorize('documents:update'),
  validate(createVersionSchema),
  async (req, res, next) => {
    try {
      const version = await documentService.createVersion(
        req.params.projectId!,
        req.params.documentId!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(201).json(version);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/documents/:documentId/versions/:version/comments
 * Add a comment to a document version
 */
router.post(
  '/:documentId/versions/:version/comments',
  authenticate,
  authorize('documents:update'),
  validate(addCommentSchema),
  async (req, res, next) => {
    try {
      const version = await documentService.addComment(
        req.params.projectId!,
        req.params.documentId!,
        Number(req.params.version),
        req.body,
        req.user!.id
      );

      res.status(201).json(version);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /projects/:projectId/documents/:documentId
 * Update document metadata
 */
router.patch(
  '/:documentId',
  authenticate,
  authorize('documents:update'),
  validate(updateDocumentSchema),
  async (req, res, next) => {
    try {
      const document = await documentService.updateDocument(
        req.params.projectId!,
        req.params.documentId!,
        req.body,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.json(document);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /projects/:projectId/documents/:documentId
 * Soft delete a document
 */
router.delete(
  '/:documentId',
  authenticate,
  authorize('documents:delete'),
  validate(getDocumentSchema),
  async (req, res, next) => {
    try {
      await documentService.deleteDocument(
        req.params.projectId!,
        req.params.documentId!,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/documents/:documentId/attachments
 * Upload an attachment
 */
router.post(
  '/:documentId/attachments',
  authenticate,
  authorize('documents:update'),
  validate(uploadAttachmentSchema),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'No file uploaded',
        });
        return;
      }

      const attachment = await documentService.uploadAttachment(
        req.params.projectId!,
        req.params.documentId!,
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        req.user!.id
      );

      res.status(201).json(attachment);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /projects/:projectId/documents/:documentId/attachments/:attachmentId
 * Download an attachment
 */
router.get(
  '/:documentId/attachments/:attachmentId',
  authenticate,
  authorize('documents:read'),
  async (req, res, next) => {
    try {
      const result = await documentService.getAttachment(
        req.params.projectId!,
        req.params.documentId!,
        req.params.attachmentId!
      );

      if (!result) {
        res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        });
        return;
      }

      res.setHeader('Content-Type', result.attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.attachment.fileName}"`);
      res.setHeader('Content-Length', result.attachment.fileSize);

      result.stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /projects/:projectId/documents/:documentId/attachments/:attachmentId
 * Delete an attachment
 */
router.delete(
  '/:documentId/attachments/:attachmentId',
  authenticate,
  authorize('documents:delete'),
  validate(deleteAttachmentSchema),
  async (req, res, next) => {
    try {
      await documentService.deleteAttachment(
        req.params.projectId!,
        req.params.documentId!,
        req.params.attachmentId!,
        req.user!.id,
        req.ip ?? undefined,
        req.requestId
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
