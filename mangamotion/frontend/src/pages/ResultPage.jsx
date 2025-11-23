import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, RefreshCw, ChevronLeft, AlertCircle, Loader } from 'lucide-react';

/**
 * ResultPage Component
 * 
 * Displays the result of a completed job with:
 * - Video player with presigned URL
 * - Job metadata (prompt, timestamps, status)
 * - Download button
 * - Regenerate button with modal to edit prompt
 * - Thumbnail gallery
 * - Real-time status polling
 */
export default function ResultPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  // State
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [regenerateSeed, setRegenerateSeed] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);

  // Polling interval ID
  const pollingIntervalRef = React.useRef(null);

  // Fetch job status
  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/status/${jobId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setJob(data);
      setError(null);

      // Stop polling if job is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      }
    } catch (err) {
      setError(`Failed to fetch job status: ${err.message}`);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and polling setup
  useEffect(() => {
    fetchJobStatus();

    // Poll every 2 seconds while job is processing
    pollingIntervalRef.current = setInterval(() => {
      fetchJobStatus();
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [jobId]);

  // Handle download
  const handleDownload = async () => {
    if (!job?.resultUrl) {
      setError('Result URL not available');
      return;
    }

    try {
      // Open presigned URL in new tab
      window.open(job.resultUrl, '_blank');
    } catch (err) {
      setError(`Download failed: ${err.message}`);
    }
  };

  // Handle regenerate
  const handleRegenerate = async () => {
    if (!regeneratePrompt.trim()) {
      setError('Prompt cannot be empty');
      return;
    }

    setRegenerating(true);
    try {
      const payload = {
        prompt: regeneratePrompt,
        seed: regenerateSeed ? parseInt(regenerateSeed, 10) : undefined
      };

      const response = await fetch('/api/generate-from-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setShowRegenerateModal(false);
      setError(null);

      // Navigate to new job result page
      navigate(`/result/${data.jobId}`);
    } catch (err) {
      setError(`Regeneration failed: ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  // Format timestamp
  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  // Format relative time
  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'queued':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Loading state
  if (loading && !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading job details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-semibold mb-2">Error</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Job not found
  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-yellow-400 font-semibold mb-2">Job Not Found</h3>
          <p className="text-yellow-300 text-sm mb-4">The job ID "{jobId}" could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Job Result
          </h1>
          <p className="text-gray-400">{jobId}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden backdrop-blur-sm">
              {/* Status Badge */}
              <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Result</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              </div>

              {/* Video Player */}
              {job.status === 'completed' && job.resultUrl ? (
                <div className="bg-black p-4">
                  <video
                    src={job.resultUrl}
                    controls
                    className="w-full rounded-lg bg-black"
                    style={{ maxHeight: '500px' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : job.status === 'processing' ? (
                <div className="bg-black p-12 flex flex-col items-center justify-center min-h-96">
                  <Loader className="w-12 h-12 text-purple-400 animate-spin mb-4" />
                  <p className="text-gray-400 mb-4">Processing... {job.progress}%</p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              ) : job.status === 'failed' ? (
                <div className="bg-black p-12 flex flex-col items-center justify-center min-h-96">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-red-400 font-semibold mb-2">Processing Failed</p>
                  <p className="text-gray-400 text-sm text-center">{job.error || 'Unknown error'}</p>
                </div>
              ) : (
                <div className="bg-black p-12 flex flex-col items-center justify-center min-h-96">
                  <Loader className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                  <p className="text-gray-400">Queued for processing...</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 border-t border-purple-500/20 flex gap-3">
                {job.status === 'completed' && (
                  <>
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                    >
                      <Download className="w-5 h-5" />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setRegeneratePrompt(job.prompt || '');
                        setShowRegenerateModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Regenerate
                    </button>
                  </>
                )}
                {job.status === 'failed' && (
                  <button
                    onClick={() => {
                      setRegeneratePrompt(job.prompt || '');
                      setShowRegenerateModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4">Details</h3>

              {/* Prompt */}
              <div className="mb-6">
                <label className="text-sm text-gray-400 font-medium block mb-2">Prompt</label>
                <p className="text-gray-200 text-sm bg-slate-900/50 p-3 rounded border border-purple-500/10 line-clamp-4">
                  {job.prompt || '(No prompt)'}
                </p>
              </div>

              {/* Progress */}
              {job.status === 'processing' && (
                <div className="mb-6">
                  <label className="text-sm text-gray-400 font-medium block mb-2">Progress</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-purple-400">{job.progress}%</span>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="mb-6">
                <label className="text-sm text-gray-400 font-medium block mb-2">Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              </div>

              {/* Created */}
              <div className="mb-6">
                <label className="text-sm text-gray-400 font-medium block mb-2">Created</label>
                <p className="text-gray-300 text-sm">{formatRelativeTime(job.createdAt)}</p>
                <p className="text-gray-500 text-xs">{formatTime(job.createdAt)}</p>
              </div>

              {/* Updated */}
              <div className="mb-6">
                <label className="text-sm text-gray-400 font-medium block mb-2">Updated</label>
                <p className="text-gray-300 text-sm">{formatRelativeTime(job.updatedAt)}</p>
                <p className="text-gray-500 text-xs">{formatTime(job.updatedAt)}</p>
              </div>

              {/* Job ID */}
              <div>
                <label className="text-sm text-gray-400 font-medium block mb-2">Job ID</label>
                <p className="text-gray-300 text-xs font-mono break-all">{job.jobId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regenerate Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-purple-500/30 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Regenerate with New Prompt</h3>

            {/* Prompt Input */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 font-medium block mb-2">Prompt</label>
              <textarea
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
                placeholder="Enter your prompt..."
                className="w-full bg-slate-900 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">{regeneratePrompt.length}/2000</p>
            </div>

            {/* Seed Input */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 font-medium block mb-2">Seed (optional)</label>
              <input
                type="number"
                value={regenerateSeed}
                onChange={(e) => setRegenerateSeed(e.target.value)}
                placeholder="Leave empty for random"
                className="w-full bg-slate-900 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateModal(false)}
                disabled={regenerating}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating || !regeneratePrompt.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {regenerating && <Loader className="w-4 h-4 animate-spin" />}
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
