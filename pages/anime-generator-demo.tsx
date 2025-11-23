import React from 'react';
import AnimeGenerator from '../components/AnimeGenerator';

const AnimeGeneratorDemo: React.FC = () => {
  const handleGenerate = async (prompt: string, images: File[]): Promise<void> => {
    console.log('Generating anime with prompt:', prompt);
    console.log('Reference images:', images);
    
    // Simulate API call
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('Generation complete');
        resolve();
      }, 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1a1f2e] to-[#0a0d11]">
      <AnimeGenerator onGenerate={handleGenerate} />
    </div>
  );
};

export default AnimeGeneratorDemo;
