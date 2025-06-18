import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import MaskCanvas from './components/MaskCanvas';
import SubmitButton from './components/SubmitButton';

function App() {
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [maskCanvasRef, setMaskCanvasRef] = useState(null);
  const [renderedImageUrl, setRenderedImageUrl] = useState(null);  // new state

  const handleSubmit = async () => {
    if (!backgroundImage || !maskCanvasRef) return;

    const maskBlob = await new Promise((resolve) => {
      maskCanvasRef.toBlob((blob) => resolve(blob), 'image/png');
    });

    const formData = new FormData();
    formData.append('image', backgroundImage);
    formData.append('mask', maskBlob);

    try {
      const response = await fetch('http://localhost:8000/render/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        alert('Failed to render image');
        return;
      }

      const data = await response.json();
      setRenderedImageUrl(data.output_image_url); // Save URL from backend

    } catch (error) {
      console.error('Error submitting images:', error);
      alert('Error submitting images');
    }
  };

  return (
    <div className="flex flex-col items-center p-6 space-y-4">
      <ImageUploader onImageUpload={setBackgroundImage} />
      {backgroundImage && (
        <MaskCanvas
          image={backgroundImage}
          setCanvasRef={setMaskCanvasRef}
        />
      )}
      {backgroundImage && <SubmitButton onClick={handleSubmit} />}

      {/* Show rendered image if available */}
      {renderedImageUrl && (
        <div className="mt-4">
          <h2>Rendered Output:</h2>
          <img src={renderedImageUrl} alt="Rendered Result" style={{ maxWidth: '100%' }} />
        </div>
      )}
    </div>
  );
}

export default App;