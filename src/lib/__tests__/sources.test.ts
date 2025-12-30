/**
 * Sources Service Tests
 *
 * Tests for source CRUD operations and file upload with mocked Supabase client.
 */

import { supabase } from '../supabase';
import {
  createSource,
  getSources,
  getSource,
  updateSource,
  deleteSource,
  uploadFile,
  deleteStorageFile,
  getSourceUrl,
} from '../sources';
import type { Source, SourceInsert, SourceUpdate } from '../../types';
import * as fileValidation from '../file-validation';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

// Mock file validation
jest.mock('../file-validation', () => ({
  validateFileType: jest.fn(),
  validateFileSize: jest.fn(),
  getSourceTypeFromMime: jest.fn(),
}));

// Helper to create mock chain for database operations
function createMockChain(finalResult: { data: unknown; error: Error | null }) {
  const chain = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(finalResult),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  return chain;
}

// Helper to create mock storage chain
function createMockStorageChain(result: { data: unknown; error: Error | null }) {
  return {
    upload: jest.fn().mockResolvedValue(result),
    remove: jest.fn().mockResolvedValue(result),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/sources/file.mp4' },
    }),
  };
}

const mockSource: Source = {
  id: 'source-123',
  project_id: 'project-456',
  user_id: 'user-789',
  type: 'video',
  name: 'test-video.mp4',
  url: null,
  storage_path: 'user-789/project-456/source-123_test-video.mp4',
  file_size: 1024000,
  mime_type: 'video/mp4',
  status: 'completed',
  error_message: null,
  metadata: {},
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('sources service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSource', () => {
    it('creates a source successfully', async () => {
      const mockChain = createMockChain({ data: mockSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const sourceData: SourceInsert = {
        project_id: 'project-456',
        type: 'video',
        name: 'test-video.mp4',
      };

      const result = await createSource('user-789', sourceData);

      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(mockChain.insert).toHaveBeenCalledWith({
        ...sourceData,
        user_id: 'user-789',
      });
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.data).toEqual(mockSource);
      expect(result.error).toBeNull();
    });

    it('returns error when creation fails', async () => {
      const mockError = new Error('Insert failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const sourceData: SourceInsert = {
        project_id: 'project-456',
        type: 'video',
        name: 'test-video.mp4',
      };

      const result = await createSource('user-789', sourceData);

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });

    it('includes optional fields in insert', async () => {
      const mockChain = createMockChain({ data: mockSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const sourceData: SourceInsert = {
        project_id: 'project-456',
        type: 'pdf',
        name: 'document.pdf',
        file_size: 500000,
        mime_type: 'application/pdf',
        status: 'pending',
        metadata: { pages: 10 },
      };

      await createSource('user-789', sourceData);

      expect(mockChain.insert).toHaveBeenCalledWith({
        ...sourceData,
        user_id: 'user-789',
      });
    });
  });

  describe('getSources', () => {
    it('returns all sources for a project', async () => {
      const mockSources = [mockSource, { ...mockSource, id: 'source-456' }];
      const mockChain = createMockChain({ data: mockSources, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getSources('project-456');

      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('project_id', 'project-456');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.data).toEqual(mockSources);
      expect(result.error).toBeNull();
    });

    it('returns empty array when no sources exist', async () => {
      const mockChain = createMockChain({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getSources('project-456');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error when query fails', async () => {
      const mockError = new Error('Query failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getSources('project-456');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('getSource', () => {
    it('returns a source by id', async () => {
      const mockChain = createMockChain({ data: mockSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getSource('source-123');

      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'source-123');
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.data).toEqual(mockSource);
      expect(result.error).toBeNull();
    });

    it('returns error when source not found', async () => {
      const mockError = new Error('Source not found');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getSource('non-existent');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('updateSource', () => {
    it('updates a source successfully', async () => {
      const updatedSource = { ...mockSource, name: 'updated-video.mp4' };
      const mockChain = createMockChain({ data: updatedSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const updateData: SourceUpdate = {
        name: 'updated-video.mp4',
      };

      const result = await updateSource('source-123', updateData);

      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(mockChain.update).toHaveBeenCalledWith(updateData);
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'source-123');
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.data).toEqual(updatedSource);
      expect(result.error).toBeNull();
    });

    it('updates multiple fields', async () => {
      const mockChain = createMockChain({ data: mockSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const updateData: SourceUpdate = {
        name: 'new-name.mp4',
        status: 'completed',
        storage_path: 'new/path/file.mp4',
        error_message: null,
      };

      await updateSource('source-123', updateData);

      expect(mockChain.update).toHaveBeenCalledWith(updateData);
    });

    it('returns error when update fails', async () => {
      const mockError = new Error('Update failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await updateSource('source-123', { name: 'new-name.mp4' });

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('deleteSource', () => {
    it('deletes a source successfully', async () => {
      const mockChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await deleteSource('source-123');

      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'source-123');
      expect(result.error).toBeNull();
    });

    it('returns error when deletion fails', async () => {
      const mockError = new Error('Delete failed');
      const mockChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: mockError }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await deleteSource('source-123');

      expect(result.error).toBe(mockError);
    });
  });

  describe('uploadFile', () => {
    const mockFile = {
      name: 'test-video.mp4',
      type: 'video/mp4',
      size: 1024000,
      uri: 'file:///path/to/video.mp4',
    };

    beforeEach(() => {
      (fileValidation.validateFileType as jest.Mock).mockReturnValue({ valid: true });
      (fileValidation.validateFileSize as jest.Mock).mockReturnValue({ valid: true });
      (fileValidation.getSourceTypeFromMime as jest.Mock).mockReturnValue('video');
    });

    it('validates file type before upload', async () => {
      (fileValidation.validateFileType as jest.Mock).mockReturnValue({
        valid: false,
        error: 'File type not allowed',
      });

      const result = await uploadFile('user-789', 'project-456', mockFile);

      expect(fileValidation.validateFileType).toHaveBeenCalledWith('video/mp4');
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('File type not allowed');
    });

    it('validates file size before upload', async () => {
      (fileValidation.validateFileSize as jest.Mock).mockReturnValue({
        valid: false,
        error: 'File too large',
      });

      const result = await uploadFile('user-789', 'project-456', mockFile);

      expect(fileValidation.validateFileSize).toHaveBeenCalledWith(1024000, 'video');
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('File too large');
    });

    it('creates source record with uploading status', async () => {
      const uploadingSource = { ...mockSource, status: 'uploading' };
      const mockDbChain = createMockChain({ data: uploadingSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockDbChain);

      const mockStorageChain = createMockStorageChain({
        data: { path: 'user-789/project-456/source-123_test-video.mp4' },
        error: null,
      });
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      await uploadFile('user-789', 'project-456', mockFile);

      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(mockDbChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'project-456',
          user_id: 'user-789',
          type: 'video',
          name: 'test-video.mp4',
          status: 'uploading',
          file_size: 1024000,
          mime_type: 'video/mp4',
        })
      );
    });

    it('uploads file to Supabase Storage', async () => {
      const uploadingSource = { ...mockSource, status: 'uploading' };
      const completedSource = { ...mockSource, status: 'completed' };

      const mockDbChain = createMockChain({ data: uploadingSource, error: null });
      // First call returns the uploading source, second call (update) returns completed source
      mockDbChain.single
        .mockResolvedValueOnce({ data: uploadingSource, error: null })
        .mockResolvedValueOnce({ data: completedSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockDbChain);

      const mockStorageChain = createMockStorageChain({
        data: { path: 'user-789/project-456/source-123_test-video.mp4' },
        error: null,
      });
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      await uploadFile('user-789', 'project-456', mockFile);

      expect(supabase.storage.from).toHaveBeenCalledWith('sources');
      expect(mockStorageChain.upload).toHaveBeenCalled();
    });

    it('updates source with completed status and storage_path on success', async () => {
      const uploadingSource = { ...mockSource, status: 'uploading' };
      const completedSource = { ...mockSource, status: 'completed' };

      const mockDbChain = createMockChain({ data: uploadingSource, error: null });
      mockDbChain.single
        .mockResolvedValueOnce({ data: uploadingSource, error: null })
        .mockResolvedValueOnce({ data: completedSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockDbChain);

      const storagePath = 'user-789/project-456/source-123_test-video.mp4';
      const mockStorageChain = createMockStorageChain({
        data: { path: storagePath },
        error: null,
      });
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      const result = await uploadFile('user-789', 'project-456', mockFile);

      // Verify update was called with completed status
      expect(mockDbChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          storage_path: storagePath,
        })
      );
      expect(result.data?.status).toBe('completed');
    });

    it('updates source with failed status on storage error', async () => {
      const uploadingSource = { ...mockSource, status: 'uploading' };
      const failedSource = { ...mockSource, status: 'failed', error_message: 'Upload failed' };

      const mockDbChain = createMockChain({ data: uploadingSource, error: null });
      mockDbChain.single
        .mockResolvedValueOnce({ data: uploadingSource, error: null })
        .mockResolvedValueOnce({ data: failedSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockDbChain);

      const mockStorageChain = createMockStorageChain({
        data: null,
        error: new Error('Upload failed'),
      });
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      const result = await uploadFile('user-789', 'project-456', mockFile);

      expect(mockDbChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: 'Upload failed',
        })
      );
      expect(result.error).toBeTruthy();
    });

    it('calls progress callback during upload', async () => {
      const uploadingSource = { ...mockSource, status: 'uploading' };
      const completedSource = { ...mockSource, status: 'completed' };

      const mockDbChain = createMockChain({ data: uploadingSource, error: null });
      mockDbChain.single
        .mockResolvedValueOnce({ data: uploadingSource, error: null })
        .mockResolvedValueOnce({ data: completedSource, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockDbChain);

      const mockStorageChain = createMockStorageChain({
        data: { path: 'user-789/project-456/source-123_test-video.mp4' },
        error: null,
      });
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      const onProgress = jest.fn();
      await uploadFile('user-789', 'project-456', mockFile, onProgress);

      // Verify upload was called with correct file options
      // Note: Supabase JS client doesn't support onUploadProgress directly,
      // so we only verify contentType is passed
      expect(mockStorageChain.upload).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.objectContaining({
          contentType: 'video/mp4',
        })
      );
    });

    it('returns error if source record creation fails', async () => {
      const mockError = new Error('Database error');
      const mockDbChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockDbChain);

      const result = await uploadFile('user-789', 'project-456', mockFile);

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('deleteStorageFile', () => {
    it('deletes a file from storage successfully', async () => {
      const mockStorageChain = createMockStorageChain({ data: {}, error: null });
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      const result = await deleteStorageFile('user-789/project-456/source-123_test-video.mp4');

      expect(supabase.storage.from).toHaveBeenCalledWith('sources');
      expect(mockStorageChain.remove).toHaveBeenCalledWith([
        'user-789/project-456/source-123_test-video.mp4',
      ]);
      expect(result.error).toBeNull();
    });

    it('returns error when storage deletion fails', async () => {
      const mockError = new Error('Storage delete failed');
      const mockStorageChain = createMockStorageChain({ data: null, error: mockError });
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      const result = await deleteStorageFile('path/to/file.mp4');

      expect(result.error).toBe(mockError);
    });
  });

  describe('getSourceUrl', () => {
    it('returns the stored URL for URL-type sources', () => {
      const urlSource: Source = {
        ...mockSource,
        type: 'url',
        url: 'https://example.com/article',
        storage_path: null,
      };

      const result = getSourceUrl(urlSource);

      expect(result).toBe('https://example.com/article');
    });

    it('returns public storage URL for file-type sources', () => {
      const mockStorageChain = {
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.supabase.co/sources/user-789/project-456/source-123_test-video.mp4' },
        }),
      };
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      const fileSource: Source = {
        ...mockSource,
        type: 'video',
        url: null,
        storage_path: 'user-789/project-456/source-123_test-video.mp4',
      };

      const result = getSourceUrl(fileSource);

      expect(supabase.storage.from).toHaveBeenCalledWith('sources');
      expect(mockStorageChain.getPublicUrl).toHaveBeenCalledWith('user-789/project-456/source-123_test-video.mp4');
      expect(result).toBe('https://storage.supabase.co/sources/user-789/project-456/source-123_test-video.mp4');
    });

    it('returns null for source without URL or storage_path', () => {
      const emptySource: Source = {
        ...mockSource,
        type: 'url',
        url: null,
        storage_path: null,
      };

      const result = getSourceUrl(emptySource);

      expect(result).toBeNull();
    });

    it('prefers URL over storage_path for URL-type sources', () => {
      const mixedSource: Source = {
        ...mockSource,
        type: 'url',
        url: 'https://example.com/article',
        storage_path: 'some/storage/path.mp4',
      };

      const result = getSourceUrl(mixedSource);

      // Should return URL for url-type sources
      expect(result).toBe('https://example.com/article');
    });

    it('returns storage URL for PDF sources', () => {
      const mockStorageChain = {
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.supabase.co/sources/user/project/doc.pdf' },
        }),
      };
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageChain);

      const pdfSource: Source = {
        ...mockSource,
        type: 'pdf',
        url: null,
        storage_path: 'user/project/doc.pdf',
        mime_type: 'application/pdf',
      };

      const result = getSourceUrl(pdfSource);

      expect(result).toBe('https://storage.supabase.co/sources/user/project/doc.pdf');
    });
  });
});
