import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import { FiFile, FiTrash2, FiDownload, FiEye, FiCalendar, FiDatabase } from 'react-icons/fi';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await apiService.documents.list();
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот документ?')) return;
    
    try {
      await apiService.documents.delete(documentId);
      setDocuments(docs => docs.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      alert('Ошибка удаления документа');
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (loading) {
    return <div className="loading">Загрузка документов...</div>;
  }

  return (
    <div className="document-list-container">
      <div className="document-list-header">
        <h3>Все документы</h3>
        <div className="document-actions">
          <Link to="/documents/upload" className="btn-primary">
            + Загрузить новый
          </Link>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <FiDatabase size={48} />
          <h4>Документов пока нет</h4>
          <p>Загрузите первый документ для начала работы</p>
          <Link to="/documents/upload" className="btn-primary">
            Загрузить документ
          </Link>
        </div>
      ) : (
        <>
          <div className="document-stats-bar">
            <span>{documents.length} документов</span>
            <span>•</span>
            <span>Всего: {formatSize(documents.reduce((sum, doc) => sum + doc.size, 0))}</span>
            <span>•</span>
            <span>{documents.filter(d => d.status === 'processed').length} обработано</span>
          </div>

          <div className="documents-table">
            <div className="table-header">
              <div className="table-cell select-cell">
                <input
                  type="checkbox"
                  checked={selected.length === documents.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(documents.map(doc => doc.id));
                    } else {
                      setSelected([]);
                    }
                  }}
                />
              </div>
              <div className="table-cell name-cell">Название</div>
              <div className="table-cell type-cell">Тип</div>
              <div className="table-cell size-cell">Размер</div>
              <div className="table-cell status-cell">Статус</div>
              <div className="table-cell date-cell">Дата загрузки</div>
              <div className="table-cell actions-cell">Действия</div>
            </div>

            <div className="table-body">
              {documents.map(document => (
                <div key={document.id} className="table-row">
                  <div className="table-cell select-cell">
                    <input
                      type="checkbox"
                      checked={selected.includes(document.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected([...selected, document.id]);
                        } else {
                          setSelected(selected.filter(id => id !== document.id));
                        }
                      }}
                    />
                  </div>
                  
                  <div className="table-cell name-cell">
                    <FiFile />
                    <span className="document-name">{document.filename}</span>
                  </div>
                  
                  <div className="table-cell type-cell">
                    <span className={`doc-type ${document.content_type?.split('/')[1] || 'unknown'}`}>
                      {document.content_type?.split('/')[1]?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="table-cell size-cell">
                    {formatSize(document.size)}
                  </div>
                  
                  <div className="table-cell status-cell">
                    <span className={`status-badge ${document.status}`}>
                      {document.status === 'processed' ? 'Обработан' : 
                       document.status === 'processing' ? 'Обработка' : 
                       document.status === 'error' ? 'Ошибка' : document.status}
                    </span>
                  </div>
                  
                  <div className="table-cell date-cell">
                    <FiCalendar size={14} />
                    {formatDate(document.uploaded_at)}
                  </div>
                  
                  <div className="table-cell actions-cell">
                    <button 
                      className="btn-icon"
                      title="Просмотреть"
                    >
                      <FiEye />
                    </button>
                    <button 
                      className="btn-icon"
                      title="Скачать"
                    >
                      <FiDownload />
                    </button>
                    <button 
                      className="btn-icon danger"
                      onClick={() => handleDelete(document.id)}
                      title="Удалить"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentList;