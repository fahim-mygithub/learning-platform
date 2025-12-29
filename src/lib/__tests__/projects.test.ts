/**
 * Projects Service Tests
 *
 * Tests for project CRUD operations with mocked Supabase client.
 */

import { supabase } from '../supabase';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  touchProject,
} from '../projects';
import type { Project, ProjectInsert, ProjectUpdate } from '../../types';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Helper to create mock chain
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

const mockProject: Project = {
  id: 'project-123',
  user_id: 'user-456',
  title: 'Test Project',
  description: 'A test project',
  status: 'draft',
  progress: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  last_accessed_at: '2024-01-01T00:00:00.000Z',
};

describe('projects service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('creates a project successfully', async () => {
      const mockChain = createMockChain({ data: mockProject, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const projectData: ProjectInsert = {
        title: 'Test Project',
        description: 'A test project',
      };

      const result = await createProject('user-456', projectData);

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockChain.insert).toHaveBeenCalledWith({
        ...projectData,
        user_id: 'user-456',
      });
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.data).toEqual(mockProject);
      expect(result.error).toBeNull();
    });

    it('returns error when creation fails', async () => {
      const mockError = new Error('Insert failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const projectData: ProjectInsert = {
        title: 'Test Project',
      };

      const result = await createProject('user-456', projectData);

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });

    it('includes optional fields in insert', async () => {
      const mockChain = createMockChain({ data: mockProject, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const projectData: ProjectInsert = {
        title: 'Test Project',
        description: 'Description',
        status: 'active',
        progress: 50,
      };

      await createProject('user-456', projectData);

      expect(mockChain.insert).toHaveBeenCalledWith({
        ...projectData,
        user_id: 'user-456',
      });
    });
  });

  describe('getProjects', () => {
    it('returns all projects for a user', async () => {
      const mockProjects = [mockProject, { ...mockProject, id: 'project-456' }];
      const mockChain = createMockChain({ data: mockProjects, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getProjects('user-456');

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-456');
      expect(mockChain.order).toHaveBeenCalledWith('last_accessed_at', { ascending: false });
      expect(result.data).toEqual(mockProjects);
      expect(result.error).toBeNull();
    });

    it('returns empty array when no projects exist', async () => {
      const mockChain = createMockChain({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getProjects('user-456');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error when query fails', async () => {
      const mockError = new Error('Query failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getProjects('user-456');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('getProject', () => {
    it('returns a project by id', async () => {
      const mockChain = createMockChain({ data: mockProject, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getProject('project-123');

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'project-123');
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.data).toEqual(mockProject);
      expect(result.error).toBeNull();
    });

    it('returns error when project not found', async () => {
      const mockError = new Error('Project not found');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await getProject('non-existent');

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('updateProject', () => {
    it('updates a project successfully', async () => {
      const updatedProject = { ...mockProject, title: 'Updated Title' };
      const mockChain = createMockChain({ data: updatedProject, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const updateData: ProjectUpdate = {
        title: 'Updated Title',
      };

      const result = await updateProject('project-123', updateData);

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockChain.update).toHaveBeenCalledWith(updateData);
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'project-123');
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();
      expect(result.data).toEqual(updatedProject);
      expect(result.error).toBeNull();
    });

    it('updates multiple fields', async () => {
      const mockChain = createMockChain({ data: mockProject, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const updateData: ProjectUpdate = {
        title: 'New Title',
        description: 'New Description',
        status: 'active',
        progress: 75,
      };

      await updateProject('project-123', updateData);

      expect(mockChain.update).toHaveBeenCalledWith(updateData);
    });

    it('returns error when update fails', async () => {
      const mockError = new Error('Update failed');
      const mockChain = createMockChain({ data: null, error: mockError });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await updateProject('project-123', { title: 'New Title' });

      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('deleteProject', () => {
    it('deletes a project successfully', async () => {
      const mockChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await deleteProject('project-123');

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'project-123');
      expect(result.error).toBeNull();
    });

    it('returns error when deletion fails', async () => {
      const mockError = new Error('Delete failed');
      const mockChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: mockError }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await deleteProject('project-123');

      expect(result.error).toBe(mockError);
    });
  });

  describe('touchProject', () => {
    it('updates last_accessed_at timestamp', async () => {
      const mockDate = '2024-06-15T12:00:00.000Z';
      jest.spyOn(global, 'Date').mockImplementation(() => ({
        toISOString: () => mockDate,
      }) as Date);

      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await touchProject('project-123');

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockChain.update).toHaveBeenCalledWith({
        last_accessed_at: mockDate,
      });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'project-123');
      expect(result.error).toBeNull();

      jest.restoreAllMocks();
    });

    it('returns error when touch fails', async () => {
      const mockError = new Error('Touch failed');
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: mockError }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await touchProject('project-123');

      expect(result.error).toBe(mockError);
    });
  });
});
