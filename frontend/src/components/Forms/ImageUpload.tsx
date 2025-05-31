import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Camera, FileImage, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

export default function ImageUpload({
  onImagesChange,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  className = '',
}: ImageUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach((rejection) => {
      const { file, errors } = rejection;
      errors.forEach((error: any) => {
        switch (error.code) {
          case 'file-too-large':
            toast.error(`${file.name} is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
            break;
          case 'file-invalid-type':
            toast.error(`${file.name} is not a supported image format.`);
            break;
          case 'too-many-files':
            toast.error(`Too many files. Maximum is ${maxFiles} images.`);
            break;
          default:
            toast.error(`Error uploading ${file.name}: ${error.message}`);
        }
      });
    });

    // Process accepted files
    const validFiles = acceptedFiles.filter(file => {
      if (uploadedFiles.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      const newFiles = [...uploadedFiles, ...validFiles].slice(0, maxFiles);
      setUploadedFiles(newFiles);
      
      // Create previews
      const newPreviews = [...previews];
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          setPreviews([...newPreviews]);
        };
        reader.readAsDataURL(file);
      });

      onImagesChange(newFiles);
      toast.success(`${validFiles.length} image(s) uploaded successfully.`);
    }
  }, [uploadedFiles, previews, maxFiles, maxSize, onImagesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    multiple: true,
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize,
  });

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    setUploadedFiles(newFiles);
    setPreviews(newPreviews);
    onImagesChange(newFiles);
    
    toast.success('Image removed.');
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setPreviews([]);
    onImagesChange([]);
    toast.success('All images cleared.');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : uploadedFiles.length >= maxFiles
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} disabled={uploadedFiles.length >= maxFiles} />
        
        <div className="flex flex-col items-center">
          {uploadedFiles.length >= maxFiles ? (
            <>
              <FileImage className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-500">Maximum files reached ({maxFiles})</p>
            </>
          ) : isDragActive ? (
            <>
              <Upload className="w-8 h-8 text-blue-500 mb-2" />
              <p className="text-blue-600">Drop the images here...</p>
            </>
          ) : (
            <>
              <Camera className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-600">Drag & drop images here, or click to select</p>
              <p className="text-sm text-gray-400 mt-1">
                {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} up to {Math.round(maxSize / 1024 / 1024)}MB
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {uploadedFiles.length}/{maxFiles} files
              </p>
            </>
          )}
        </div>
      </div>

      {/* File Previews */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Header with clear all button */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">
                Uploaded Images ({uploadedFiles.length}/{maxFiles})
              </h4>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  {/* Image Preview */}
                  {previews[index] ? (
                    <img
                      src={previews[index]}
                      alt={file.name}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <FileImage className="w-6 h-6 text-gray-400" />
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* File Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-300">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>

                  {/* File Size Warning */}
                  {file.size > maxSize * 0.8 && (
                    <div className="absolute top-1 left-1">
                      <AlertCircle className="w-4 h-4 text-yellow-500" title="Large file size" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Upload Progress/Status */}
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Total Size:</span>
                <span>
                  {(uploadedFiles.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              {uploadedFiles.length === maxFiles && (
                <p className="text-yellow-600 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Maximum file limit reached
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}