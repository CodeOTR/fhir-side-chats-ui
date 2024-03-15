import React, { useState } from 'react';
import axios from 'axios';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

const RasaChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() !== '') {
      const userMessage: Message = {
        text: inputValue,
        sender: 'user',
      };
      setMessages([...messages, userMessage]);
      setInputValue('');

      try {
        const response = await axios.post('http://localhost:5005/webhooks/rest/webhook', {
          sender: 'user',
          message: userMessage.text,
        });

        const botMessage: Message = {
          text: response.data[0].text,
          sender: 'bot',
        };
        setMessages([...messages, userMessage, botMessage]);
      } catch (error) {
        console.error('Error communicating with Rasa server:', error);
      }
    }
  };

  return (
    <div>
      <div>
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.sender}: </strong>
            {message.text}
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

export default RasaChat;