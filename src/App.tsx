import React from 'react';
import ChatWidget from './ChatWidget';

const App: React.FC = () => {
  return (
    <div>
      <h1>FHIR Side Chats</h1>
      <ChatWidget />
    </div>
  );
};

export default App;