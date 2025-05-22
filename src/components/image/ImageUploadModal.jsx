import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Upload, X } from 'lucide-react';

export const ImageUploadModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const navigate = useNavigate();
  
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      
      // Create preview URL
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      
      // Cleanup function to revoke URL when component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.webp']
    },
    maxFiles: 1
  });

  const handleProcessImage = () => {
    if (!file) return;
    
    // Navigate to note editor with the raw file
    navigate('/create', { 
      state: { 
        imageFile: file
      }
    });
    onClose();
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    onClose();
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleCancel]);

  // Modal overlay animation
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Modal content animation
  const modalVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { scale: 0.8, opacity: 0 }
  };

  // Scanning line animation
  const scanLineVariants = {
    initial: { y: 0, opacity: 0.7 },
    animate: { 
      y: '100%', 
      opacity: 0.7, 
      transition: { 
        repeat: Infinity, 
        duration: 1.5, 
        ease: 'linear'
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={handleCancel}
      >
        <motion.div
          className="w-full max-w-md bg-bg-primary rounded-lg shadow-xl overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center px-4 py-3 border-b border-overlay/10">
            <h3 className="text-lg font-semibold">Create Note from Image</h3>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4">
            {!file ? (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors bg-bg-primary/80 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-primary/30 focus:outline-none ${
                  isDragActive ? 'border-primary bg-primary/10' : 'border-overlay/20 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto text-primary mb-3" />
                <p className="text-base font-medium text-text-primary">
                  {isDragActive
                    ? "Drop the image here..."
                    : "Drag & drop an image, or click to select"
                  }
                </p>
                <p className="text-xs text-text-primary/50 mt-2">
                  Supported: JPEG, PNG, WebP
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative rounded-xl overflow-hidden border border-overlay/20 shadow-md">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-full h-56 object-cover bg-bg-primary"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                  >
                    Change Image
                  </Button>
                  <Button 
                    variant="default"
                    onClick={handleProcessImage}
                  >
                    Create Note from Image
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-6 text-xs text-text-primary/60 text-center">
              <p>Image will be analyzed by AI to extract title, description, and content for your note.</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 