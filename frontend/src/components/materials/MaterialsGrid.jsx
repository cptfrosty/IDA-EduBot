import React from 'react';
import MaterialCard from './MaterialCard';

const MaterialsGrid = ({ materials }) => {
  return (
    <div className="materials-grid">
      {materials.length === 0 ? (
        <div className="empty-state">
          <p>Материалы не найдены</p>
        </div>
      ) : (
        materials.map(material => (
          <MaterialCard key={material.id} material={material} />
        ))
      )}
    </div>
  );
};

export default MaterialsGrid;