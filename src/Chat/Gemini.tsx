import React, { useEffect, useState } from "react";
import { ChatSession, GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

interface Message {
  role: "user" | "model";
  parts: string;
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chat, setChat] = useState<ChatSession | null>(null);

  useEffect(() => {
    initializeChat();
  }, []); // Empty array ensures this runs only on mount and not on updates

  const initializeChat = async () => {
    if (chat) return;
    try {
      var apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      console.log("API Key:", apiKey);
      const genAI = new GoogleGenerativeAI(apiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const initialChat = model.startChat({
        history: [],
        generationConfig: {
          maxOutputTokens: 100,
        },
      });

      console.log("Chat initialized:", initialChat);

      setChat(initialChat);
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() !== "") {
      const userMessage: Message = {
        role: "user",
        parts: inputValue,
      };

      setMessages([...messages, userMessage]);
      setInputValue("");

      try {
        if (!chat) {
          throw new Error("Chat not initialized");
        }

        const result = await chat!.sendMessage(userMessage.parts);
        const response = await result.response;
        const text = await response.text();

        const modelMessage: Message = {
          role: "model",
          parts: text,
        };

        setMessages([...messages, userMessage, modelMessage]);

        // Summarize the conversation into FHIR data structures
        const fhirData = summarizeToFHIR(messages);
        console.log("FHIR Data:", fhirData);
      } catch (error) {
        console.error("Error processing message:", error);
      }
    }
  };
  const summarizeToFHIR = async (conversation: Message[]) => {
    const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Please extract the relevant symptom information from the following conversation and map it to FHIR data structures:
  
      ${conversation
        .map((message) => `${message.role}: ${message.parts}`)
        .join("\n")}
  
      Desired output format:
      {
        "resourceType": "Condition",
        "code": {
          "coding": [
            {
              "system": "http://snomed.info/sct",
              "code": "SNOMED_CT_CODE",
              "display": "SYMPTOM_NAME"
            }
          ],
          "text": "SYMPTOM_NAME"
        },
        "subject": {
          "reference": "Patient/PATIENT_ID"
        },
        "severity": {
          "coding": [
            {
              "system": "http://snomed.info/sct",
              "code": "SEVERITY_CODE",
              "display": "SEVERITY"
            }
          ],
          "text": "SEVERITY"
        },
        "onsetDateTime": "ONSET_DATETIME"
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();
      const fhirData = JSON.parse(text);
      return fhirData;
    } catch (error) {
      console.error("Error summarizing to FHIR:", error);
      return null;
    }
  };

  return (
    <div>
      <div>
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.role}: </strong>
            {message.parts}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Type your message..."
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
};

export default Chatbot;
