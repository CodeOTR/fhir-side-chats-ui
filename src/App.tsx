import React from "react";
import RasaChat from "./Chat/Rasa";
import GeminiChat from "./Chat/Gemini";

const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen">
      <h1 className="bg-stone-200 p-4 font-bold text-xl">FHIR Side Chats</h1>
      <GeminiChat />
    </div>
  );
};

export default App;
