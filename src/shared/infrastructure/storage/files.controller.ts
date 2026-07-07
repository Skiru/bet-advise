/* eslint-disable */
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Inject,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ObjectStoragePortToken } from '../../application/storage/object-storage.port';
import type { ObjectStoragePort } from '../../application/storage/object-storage.port';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(
    @Inject(ObjectStoragePortToken)
    private readonly storage: ObjectStoragePort,
  ) {}

  @Post('demo-upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a demo file to private S3' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const sanitizedOriginalName = String(file.originalname || 'file').replace(
      /[^a-zA-Z0-9.-]/g,
      '_',
    );
    const cleanKey = `uploads/${Date.now()}-${sanitizedOriginalName}`;

    await this.storage.putObject(cleanKey, file.buffer, file.mimetype, {
      originalName: file.originalname,
    });

    return {
      message: 'File uploaded successfully',
      key: cleanKey,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  @Get(':key/head')
  @ApiOperation({ summary: 'Get S3 file metadata' })
  async getFileHead(@Param('key') key: string) {
    const decodedKey = decodeURIComponent(key);
    const head = await this.storage.headObject(decodedKey);
    return head;
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete file from S3' })
  async deleteFile(@Param('key') key: string) {
    const decodedKey = decodeURIComponent(key);
    await this.storage.deleteObject(decodedKey);
  }
}
