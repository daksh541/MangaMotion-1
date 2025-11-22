import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface ImageFile extends File {
  preview: string;
  id: string;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

interface PresignedUrlResponse {
  url: string;
  fields: {
    [key: string]: string;
  };
  fileUrl: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ImageUploader() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [currentCropIndex, setCurrentCropIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cropModalRef = useRef<HTMLDivElement>(null);

  // Handle file drop/select
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      ...file,
      id: uuidv4(),
      preview: URL.createObjectURL(file),
      status: 'idle' as const,
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Handle drag and drop reordering
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setFiles(items);
  };

  // Handle crop
  const openCropModal = (index: number) => {
    setCurrentCropIndex(index);
    setIsCropModalOpen(true);
  };

  const handleCrop = (cropData: { x: number; y: number; width: number; height: number }) => {
    if (currentCropIndex === null) return;
    
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[currentCropIndex] = {
        ...newFiles[currentCropIndex],
        crop: cropData
      };
      return newFiles;
    });
    
    setIsCropModalOpen(false);
    setCurrentCropIndex(null);
  };

  // Get presigned URL from your backend
  const getPresignedUrl = async (file: File): Promise<PresignedUrlResponse> => {
    const response = await fetch(`${API_BASE_URL}/upload/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        fileType: file.type,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get presigned URL');
    }
    
    return response.json();
  };

  // Upload file to S3 using presigned URL
  const uploadFile = async (file: ImageFile, index: number) => {
    try {
      // Update file status to uploading
      setFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = { ...newFiles[index], status: 'uploading', progress: 0 };
        return newFiles;
      });

      // Get presigned URL
      const { url, fields } = await getPresignedUrl(file);
      
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', file);

      // Upload file
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setFiles(prev => {
            const newFiles = [...prev];
            newFiles[index] = { ...newFiles[index], progress };
            return newFiles;
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status === 204) {
          setFiles(prev => {
            const newFiles = [...prev];
            newFiles[index] = { ...newFiles[index], status: 'success', progress: 100 };
            return newFiles;
          });
        } else {
          throw new Error('Upload failed');
        }
      };

      xhr.onerror = () => {
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[index] = { 
            ...newFiles[index], 
            status: 'error', 
            error: 'Upload failed. Click to retry.' 
          };
          return newFiles;
        });
      };

      xhr.open('POST', url, true);
      xhr.send(formData);
      
    } catch (error) {
      setFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = { 
          ...newFiles[index], 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        };
        return newFiles;
      });
    }
  };

  // Handle upload all
  const handleUploadAll = async () => {
    setIsUploading(true);
    
    const uploadPromises = files
      .filter(file => file.status !== 'success')
      .map((file, index) => uploadFile(file, index));
    
    await Promise.all(uploadPromises);
    setIsUploading(false);
  };

  // Handle remove file
  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => URL.revokeObjectURL(file.preview));
    };
  }, [files]);

  return (
    <div className="container mx-auto p-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          <p className="text-lg font-medium text-gray-700">
            {isDragActive ? 'Drop the files here' : 'Drag & drop files here, or click to select'}
          </p>
          <p className="text-sm text-gray-500">
            Upload images (JPG, PNG, WebP) up to 10MB
          </p>
        </div>
      </div>

      {/* File list */}
      <div className="mt-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="files">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {files.map((file, index) => (
                  <Draggable key={file.id} draggableId={file.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center p-3 bg-white rounded-lg shadow ${
                          file.status === 'error' ? 'border-l-4 border-red-500' : ''
                        }`}
                      >
                        {/* Drag handle */}
                        <div {...provided.dragHandleProps} className="mr-3 text-gray-400 hover:text-gray-600 cursor-move">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded overflow-hidden">
                          <img 
                            src={file.preview} 
                            alt={file.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* File info */}
                        <div className="ml-4 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                          
                          {file.status === 'uploading' && file.progress !== undefined && (
                            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          )}
                          
                          {file.status === 'error' && file.error && (
                            <p className="text-xs text-red-600 mt-1">{file.error}</p>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="ml-4 flex space-x-2">
                          <button
                            type="button"
                            onClick={() => openCropModal(index)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title="Crop"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                            </svg>
                          </button>
                          
                          {file.status === 'error' ? (
                            <button
                              type="button"
                              onClick={() => uploadFile(file, index)}
                              className="p-1 text-gray-500 hover:text-green-600"
                              title="Retry upload"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          ) : file.status === 'success' ? (
                            <span className="p-1 text-green-500">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : null}
                          
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title="Remove"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Upload button */}
      {files.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleUploadAll}
            disabled={isUploading || files.every(f => f.status === 'success')}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isUploading || files.every(f => f.status === 'success')
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload All'}
          </button>
        </div>
      )}

      {/* Crop Modal */}
      {isCropModalOpen && currentCropIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            ref={cropModalRef}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Crop Image</h3>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 h-96 bg-gray-100 flex items-center justify-center">
              {/* In a real implementation, you would use a library like react-image-crop here */}
              <div className="text-center p-4">
                <p className="mb-2">Image cropping UI would appear here</p>
                <p className="text-sm text-gray-500">
                  Using a library like react-image-crop would provide the actual cropping functionality
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCrop({ x: 0, y: 0, width: 100, height: 100 })}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
