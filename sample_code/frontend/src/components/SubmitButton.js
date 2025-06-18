import React from 'react';

const SubmitButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
    >
      Submit Image + Mask
    </button>
  );
};

export default SubmitButton;