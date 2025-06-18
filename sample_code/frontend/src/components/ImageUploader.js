import React from 'react';

const ImageUploader = ({ onImageUpload }) => {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <div className="w-full text-center">
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="file-input file-input-bordered"
      />
    </div>
  );
};

export default ImageUploader;