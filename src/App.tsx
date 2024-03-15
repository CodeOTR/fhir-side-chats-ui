import React from 'react';
import RasaChat from './Chat/Rasa';
import GeminiChat from './Chat/Gemini';

const App: React.FC = () => {
  return (
    <div>
      <h1>FHIR Side Chats</h1>
      <GeminiChat />
    </div>
  );
};

export default App;