import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResultPage from './ResultPage';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ jobId: 'test-job-123' }),
  useNavigate: () => jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('ResultPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <ResultPage />
      </BrowserRouter>
    );
  };

  const mockJobResponse = (overrides = {}) => ({
    jobId: 'test-job-123',
    status: 'completed',
    progress: 100,
    prompt: 'turn this into anime, cinematic',
    createdAt: '2025-11-23T18:30:00.000Z',
    updatedAt: '2025-11-23T18:35:00.000Z',
    resultUrl: 'https://minio.example.com/outputs/test-job-123/video.mp4?token=xyz',
    error: null,
    ...overrides
  });

  describe('Loading State', () => {
    test('should show loading spinner initially', () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderPage();

      expect(screen.getByText('Loading job details...')).toBeInTheDocument();
    });
  });

  describe('Completed Job Display', () => {
    test('should display completed job with video player', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Job Result')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('turn this into anime, cinematic')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    });

    test('should display video element with presigned URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      renderPage();

      await waitFor(() => {
        const video = screen.getByRole('application');
        expect(video).toHaveAttribute('src', 'https://minio.example.com/outputs/test-job-123/video.mp4?token=xyz');
      });
    });

    test('should display job metadata correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('test-job-123')).toBeInTheDocument();
        expect(screen.getByDisplayValue('turn this into anime, cinematic')).toBeInTheDocument();
      });
    });

    test('should display formatted timestamps', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/ago/)).toBeInTheDocument(); // Relative time
      });
    });
  });

  describe('Processing Job Display', () => {
    test('should display processing state with progress bar', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({ status: 'processing', progress: 50 })
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Processing')).toBeInTheDocument();
        expect(screen.getByText('Processing... 50%')).toBeInTheDocument();
      });
    });

    test('should update progress when polling', async () => {
      const responses = [
        { status: 'processing', progress: 30 },
        { status: 'processing', progress: 60 },
        { status: 'completed', progress: 100, resultUrl: 'https://example.com/video.mp4' }
      ];

      let callCount = 0;
      global.fetch.mockImplementation(() => {
        const response = responses[callCount];
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => mockJobResponse(response)
        });
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Processing... 30%')).toBeInTheDocument();
      });

      // Wait for polling to update
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Failed Job Display', () => {
    test('should display failed state with error message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({
          status: 'failed',
          error: 'Model inference failed: CUDA out of memory'
        })
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Processing Failed')).toBeInTheDocument();
        expect(screen.getByText('Model inference failed: CUDA out of memory')).toBeInTheDocument();
      });
    });

    test('should show Try Again button for failed jobs', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({ status: 'failed', error: 'Error' })
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Queued Job Display', () => {
    test('should display queued state', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({ status: 'queued', progress: 0 })
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Queued')).toBeInTheDocument();
        expect(screen.getByText('Queued for processing...')).toBeInTheDocument();
      });
    });
  });

  describe('Download Functionality', () => {
    test('should open presigned URL in new tab on download', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /download/i }));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://minio.example.com/outputs/test-job-123/video.mp4?token=xyz',
        '_blank'
      );

      windowOpenSpy.mockRestore();
    });
  });

  describe('Regenerate Modal', () => {
    test('should open regenerate modal when clicking regenerate button', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));

      expect(screen.getByText('Regenerate with New Prompt')).toBeInTheDocument();
    });

    test('should pre-fill prompt in modal', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      renderPage();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      });

      const textarea = screen.getByPlaceholderText('Enter your prompt...');
      expect(textarea).toHaveValue('turn this into anime, cinematic');
    });

    test('should close modal on cancel', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      renderPage();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      });

      expect(screen.getByText('Regenerate with New Prompt')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText('Regenerate with New Prompt')).not.toBeInTheDocument();
    });

    test('should submit regenerate request with new prompt', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJobResponse()
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'new-job-456' })
        });

      renderPage();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      });

      const textarea = screen.getByPlaceholderText('Enter your prompt...');
      fireEvent.change(textarea, { target: { value: 'new prompt' } });

      fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/generate-from-prompt',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'new prompt' })
          })
        );
      });
    });

    test('should disable regenerate button when prompt is empty', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse()
      });

      renderPage();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      });

      const textarea = screen.getByPlaceholderText('Enter your prompt...');
      fireEvent.change(textarea, { target: { value: '' } });

      const submitButton = screen.getAllByRole('button', { name: /regenerate/i })[1];
      expect(submitButton).toBeDisabled();
    });

    test('should accept optional seed parameter', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJobResponse()
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'new-job-456' })
        });

      renderPage();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      });

      const seedInput = screen.getByPlaceholderText('Leave empty for random');
      fireEvent.change(seedInput, { target: { value: '42' } });

      fireEvent.click(screen.getAllByRole('button', { name: /regenerate/i })[1]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/generate-from-prompt',
          expect.objectContaining({
            body: JSON.stringify({ prompt: 'turn this into anime, cinematic', seed: 42 })
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error when fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch job status/)).toBeInTheDocument();
      });
    });

    test('should display error when HTTP response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/HTTP 404/)).toBeInTheDocument();
      });
    });

    test('should display error when job not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/could not be found/)).toBeInTheDocument();
      });
    });
  });

  describe('Status Badge Colors', () => {
    test('should display correct color for completed status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({ status: 'completed' })
      });

      renderPage();

      await waitFor(() => {
        const badge = screen.getByText('Completed');
        expect(badge).toHaveClass('bg-green-500/20');
      });
    });

    test('should display correct color for processing status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({ status: 'processing' })
      });

      renderPage();

      await waitFor(() => {
        const badge = screen.getByText('Processing');
        expect(badge).toHaveClass('bg-blue-500/20');
      });
    });

    test('should display correct color for failed status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({ status: 'failed' })
      });

      renderPage();

      await waitFor(() => {
        const badge = screen.getByText('Failed');
        expect(badge).toHaveClass('bg-red-500/20');
      });
    });
  });

  describe('Polling Behavior', () => {
    test('should stop polling when job is completed', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({ status: 'completed' })
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });

      // Verify fetch was called only once (no polling)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should stop polling when job is failed', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobResponse({ status: 'failed' })
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      // Verify fetch was called only once (no polling)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
