import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Trash2, RefreshCw, Loader, AlertCircle, Play } from 'lucide-react';

/**
 * Dashboard Component
 * 
 * Displays user's job history as a gallery with:
 * - Thumbnail previews
 * - Status badges
 * - Filtering and search
 * - Bulk actions
 * - Pagination
 */
export default function Dashboard() {
  const navigate = useNavigate();

  // State
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  // Fetch jobs
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page,
        limit,
        ...(statusFilter && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`/api/me/jobs?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setJobs(data.jobs);
    } catch (err) {
      setError(`Failed to fetch jobs: ${err.message}`);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/me/jobs/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchJobs();
    fetchStats();
  }, [page, limit, statusFilter, searchQuery]);

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  // Handle filter
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  // Handle job selection
  const toggleJobSelection = (jobId) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return;

    if (!window.confirm(`Delete ${selectedJobs.size} job(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      for (const jobId of selectedJobs) {
        await fetch(`/api/me/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
      }

      setSelectedJobs(new Set());
      await fetchJobs();
      await fetchStats();
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Get status color
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

  // Format date
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Loading state
  if (loading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            My Jobs
          </h1>
          <p className="text-gray-400">View and manage your generation history</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
            </div>
            <div className="bg-slate-800/50 border border-green-500/20 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <div className="bg-slate-800/50 border border-blue-500/20 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-sm">Processing</p>
              <p className="text-2xl font-bold text-blue-400">{stats.processing}</p>
            </div>
            <div className="bg-slate-800/50 border border-yellow-500/20 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-sm">Queued</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.queued}</p>
            </div>
            <div className="bg-slate-800/50 border border-red-500/20 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-gray-400 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 mb-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by prompt..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full bg-slate-900 border border-purple-500/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/30 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-purple-500 appearance-none"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedJobs.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 font-medium transition-all disabled:opacity-50"
              >
                {deleting && <Loader className="w-4 h-4 animate-spin" />}
                <Trash2 className="w-4 h-4" />
                Delete ({selectedJobs.size})
              </button>
            )}
          </div>
        </div>

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No jobs found</p>
            <button
              onClick={() => navigate('/')}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Create your first job
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {jobs.map((job) => (
                <div
                  key={job.jobId}
                  className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden backdrop-blur-sm hover:border-purple-500/50 transition-all group cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative bg-black h-48 flex items-center justify-center overflow-hidden">
                    {job.thumbnailUrl ? (
                      <img
                        src={job.thumbnailUrl}
                        alt={job.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        <Play className="w-12 h-12 text-gray-600 mb-2" />
                        <p className="text-gray-500 text-sm">No preview</p>
                      </div>
                    )}

                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedJobs.has(job.jobId)}
                      onChange={() => toggleJobSelection(job.jobId)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-3 left-3 w-5 h-5 cursor-pointer"
                    />

                    {/* Status Badge */}
                    <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>

                    {/* Progress Overlay */}
                    {job.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center">
                          <Loader className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                          <p className="text-white text-sm">{job.progress}%</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Prompt */}
                    <p className="text-gray-200 text-sm mb-3 line-clamp-2 h-10">
                      {job.prompt || '(No prompt)'}
                    </p>

                    {/* Date */}
                    <p className="text-gray-500 text-xs mb-4">
                      {formatDate(job.createdAt)}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/result/${job.jobId}`)}
                        className="flex-1 flex items-center justify-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded px-3 py-2 text-purple-400 text-sm font-medium transition-all"
                      >
                        <Play className="w-4 h-4" />
                        View
                      </button>

                      {job.resultUrl && (
                        <button
                          onClick={() => window.open(job.resultUrl, '_blank')}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded px-3 py-2 text-green-400 text-sm font-medium transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const prompt = job.prompt || '';
                          navigate('/', { state: { regeneratePrompt: prompt } });
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded px-3 py-2 text-blue-400 text-sm font-medium transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 font-medium transition-all disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {page}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={jobs.length < limit}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-400 font-medium transition-all disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
