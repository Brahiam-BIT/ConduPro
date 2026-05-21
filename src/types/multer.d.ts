declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }
  }
}

declare module 'multer' {
  import type { Request } from 'express';

  export interface StorageEngine {
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error?: Error | null, info?: Partial<Express.Multer.File>) => void,
    ): void;
    _removeFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null) => void,
    ): void;
  }

  export function memoryStorage(): StorageEngine;
}
