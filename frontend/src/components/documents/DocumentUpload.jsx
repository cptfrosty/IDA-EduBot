import React, { useState, useRef } from 'react';
import { FiUpload, FiFile, FiX, FiCheck } from 'react-icons/fi';
import { chatService } from '../../services/chatService';

const DocumentUpload = ({ onUploadComplete }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => 
      ['application/pdf', 'text/plain', 'application/msword', 
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'text/markdown'].includes(file.type)
    );

    setFiles(prev => [...prev, ...validFiles.map(file => ({
      file,
      status: 'pending',
      error: null
    }))]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    const uploadedFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      
      try {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading' } : f
        ));

        const result = await chatService.uploadDocument(fileData.file);
        
        if (result.success) {
          uploadedFiles.push(result.data);
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'success' } : f
          ));
        } else {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error', error: result.error } : f
          ));
        }
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: 'Ошибка загрузки' } : f
        ));
      }

      setProgress(((i + 1) / files.length) * 100);
    }

    setUploading(false);
    
    if (uploadedFiles.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedFiles);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="document-upload">
      <div className="upload-header">
        <h4>Загрузка документов</h4>
        <p>Поддерживаемые форматы: PDF, TXT, DOC, DOCX, MD</p>
      </div>

      <div className="upload-area" onClick={() => fileInputRef.current.click()}>
        <FiUpload size={48} />
        <p>Перетащите файлы или нажмите для выбора</p>
        <span>Максимальный размер: 50MB</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept=".pdf,.txt,.doc,.docx,.md"
      />

      {files.length > 0 && (
        <div className="files-list">
          <h5>Выбранные файлы ({files.length})</h5>
          {files.map((fileData, index) => (
            <div key={index} className={`file-item ${fileData.status}`}>
              <div className="file-info">
                <FiFile />
                <div className="file-details">
                  <span className="file-name">{fileData.file.name}</span>
                  <span className="file-size">{formatFileSize(fileData.file.size)}</span>
                </div>
              </div>
              
              <div className="file-actions">
                {fileData.status === 'pending' && (
                  <button onClick={() => removeFile(index)} className="btn-icon">
                    <FiX />
                  </button>
                )}
                
                {fileData.status === 'uploading' && (
                  <div className="loading">Загрузка...</div>
                )}
                
                {fileData.status === 'success' && (
                  <FiCheck className="success-icon" />
                )}
                
                {fileData.status === 'error' && (
                  <div className="error">
                    <FiX /> {fileData.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{Math.round(progress)}%</span>
        </div>
      )}

      <div className="upload-actions">
        <button 
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="btn-primary"
        >
          {uploading ? 'Загрузка...' : `Загрузить ${files.length} файлов`}
        </button>
        
        <button 
          onClick={() => setFiles([])}
          disabled={files.length === 0 || uploading}
          className="btn-secondary"
        >
          Очистить
        </button>
      </div>
    </div>
  );
};

export default DocumentUpload;