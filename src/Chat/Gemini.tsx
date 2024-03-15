import React, { useEffect, useState } from "react";
import { ChatSession, GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

interface Message {
  role: "user" | "model" | "function";
  parts: string;
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chat, setChat] = useState<ChatSession | null>(null);
  const [fhirData, setFhirData] = useState<any | null>(null);

  useEffect(() => {
    initializeChat();
  }, []); // Empty array ensures this runs only on mount and not on updates

  const intro =
    "Hello! I am a symptom-checking chatbot. Can you please tell me what symptoms or health concerns you are experiencing?";

  const initializeChat = async () => {
    if (chat) return;
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.REACT_APP_GEMINI_API_KEY!
      );
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const systemPrompt = `
          You are a symptom-checking chatbot designed to collect information about the user's physical and mental health conditions. Your purpose is to gather relevant symptom details, understand the user's concerns, and provide helpful information and guidance.
      
          Your conversation should follow these guidelines:
          1. Greet the user and ask about their symptoms or health concerns.
          2. Ask follow-up questions to gather more specific details about the symptoms, such as severity, duration, and any additional context.
          3. Show empathy and understanding towards the user's concerns.
          4. Provide relevant information and guidance based on the user's symptoms.
          5. Encourage the user to seek professional medical advice if necessary.
          6. Summarize the collected symptom information and map it to FHIR data structures for further analysis and integration with healthcare systems.
      
          Remember to maintain a friendly and professional tone throughout the conversation. Let's start by greeting the user and asking about their symptoms.
        `;

      const initialChat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          {
            role: "model",
            parts: [
              {
                text: intro,
              },
            ],
          },
          // Test messages
          {
            role: "user",
            parts: [
              {
                text: "I have a pretty bad headache",
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: "I understand that you have a headache. Can you please describe the headache in more detail? What is the severity of the pain? How long have you been experiencing the headache? Is there anything else you can tell me about the headache, such as any associated symptoms or potential triggers?",
              },
            ],
          },
          {
            role: "user",
            parts: [
              {
                text: "I have a pretty bad headache. It is a six out of 10 and it's been going on for four hours. It is mostly located behind my eyes.",
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: "Thank you for providing more details about your headache. It sounds like you are experiencing a moderate to severe headache that is primarily located behind your eyes. Have you taken any medication for the headache? Are there any other symptoms associated with the headache, such as nausea, vomiting, or sensitivity to light or sound?",
              },
            ],
          },
          {
            role: "user",
            parts: [
              {
                text: "I have a pretty bad headache. It is a six out of 10 and it's been going on for four hours. It is mostly located behind my eyes and standing up, make it worse.",
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: "I understand that your headache is worsening when you stand up. This could be a sign of a more serious underlying condition, such as increased intracranial pressure. It is important to seek medical attention as soon as possible to rule out any serious causes and receive appropriate treatment. In the meantime, please lie down and rest in a quiet, dark room. Avoid straining or sudden movements that may worsen the headache.",
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
        },
      });

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
      } catch (error) {
        console.error("Error processing message:", error);
      }
    }
  };
  const summarizeToFHIRCondition = async (conversation: Message[]) => {
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
      var formatted = text;

      if (text.includes("```json")) {
        formatted = text.split("```json")[1].split("```")[0];
      }

      if (text.includes("```")) {
        formatted = text.split("```")[1].split("```")[0];
      }

      const fhirData = JSON.parse(formatted);
      console.log("FHIR Data:", fhirData);
      setFhirData(fhirData);
      return fhirData;
    } catch (error) {
      console.error("Error summarizing to FHIR:", error);
      return null;
    }
  };

  // https://build.fhir.org/questionnaire.html#resource
  const summarizeToFhirQuestionnaire = async (conversation: Message[]) => {
    const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Please create a FHIR Questionnaire resource based on the following conversation:
  
      ${conversation
        .map((message) => `${message.role}: ${message.parts}`)
        .join("\n")}
  
      The Questionnaire should capture the relevant symptom information discussed in the conversation. Each question should correspond to a specific symptom-related detail, such as the symptom description, severity, duration, associated symptoms, and aggravating factors.
  
      Use the following format for the Questionnaire resource:
  
      {
        "resourceType": "Questionnaire",
        "id": "symptom-questionnaire",
        "title": "Symptom Questionnaire",
        "status": "draft",
        "item": [
          {
            "linkId": "1",
            "text": "QUESTION_TEXT",
            "type": "QUESTION_TYPE",
            "required": true
          },
          // Add more question items as needed
        ]
      }
  
      Replace QUESTION_TEXT with the actual question text and QUESTION_TYPE with the appropriate question type (e.g., "string", "choice", "boolean").
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();
      var formatted = text;

      if (text.includes("```json")) {
        formatted = text.split("```json")[1].split("```")[0];
      }

      if (text.includes("```")) {
        formatted = text.split("```")[1].split("```")[0];
      }

      const fhirData = JSON.parse(formatted);

      setFhirData(fhirData);
      return fhirData;
    } catch (error) {
      console.error("Error summarizing to FHIR Questionnaire:", error);
      return null;
    }
  };

  // https://build.fhir.org/questionnaireresponse.html#resource
  const summarizeToFhirQuestionnaireResponse = async (
    conversation: Message[]
  ) => {
    const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      Please create a FHIR QuestionnaireResponse resource based on the following conversation:
  
      ${conversation
        .map((message) => `${message.role}: ${message.parts}`)
        .join("\n")}
  
      The QuestionnaireResponse should capture the questions asked by the chatbot and the corresponding answers provided by the user. Each item in the QuestionnaireResponse should represent a question-answer pair.
  
      Use the following format for the QuestionnaireResponse resource:
  
      {
        "resourceType": "QuestionnaireResponse",
        "id": "symptom-questionnaire-response",
        "questionnaire": "Questionnaire/symptom-questionnaire",
        "status": "completed",
        "item": [
          {
            "linkId": "1",
            "text": "QUESTION_TEXT",
            "answer": [            {
                "valueString": "USER_ANSWER"
              }
            ]
          },
          // Add more q      ]
      }
  
      Replace QUESTION_TEXT with the actual question text and USER_ANSWER with the user's corresponding answer.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();
      var formatted = text;
      console.log("text", formatted);
      console.log("contains json", text.includes("```json"));

      if (text.includes("```json")) {
        formatted = text.split("```json")[1].split("```")[0];
      }

      if (formatted.includes("```")) {
        formatted = text.split("```")[1].split("```")[0];
      }

      console.log("formatted", formatted);

      const fhirData = JSON.parse(formatted);

      setFhirData(fhirData);
      return fhirData;
    } catch (error) {
      console.error("Error summarizing to FHIR QuestionnaireResponse:", error);
      return null;
    }
  };

  return (
    <div className="p-12 flex flex-col h-full">
      <div className="py-4 text-2xl font-mono">{intro}</div>
      <div>
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.role}: </strong>
            {message.parts}
          </div>
        ))}
      </div>
      <div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type your message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
      {fhirData && (
        <div>
          <h2 className="text-2xl font-bold py-4">FHIR Data</h2>
          <p>{JSON.stringify(fhirData, null, 2)}</p>
        </div>
      )}
      <div className="grow"></div>
      <div className="flex gap-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            summarizeToFHIRCondition(messages);
          }}
        >
          FHIR Condition
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            summarizeToFhirQuestionnaire(messages);
          }}
        >
          FHIR Questionnaire
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={async () => {
            const messages = await chat?.getHistory();

            if(!messages) return;

            summarizeToFhirQuestionnaireResponse(
              messages!.map((message) => ({
                role: message.role,
                parts: message.parts[0].text ?? "",
              }))
            );
          }}
        >
          FHIR Questionnaire Response
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
